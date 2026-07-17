"""Coverage report: compare fetcher candidates against published log.

Answers: which fetcher-collected items are NOT yet in claude_pulse_log.md?
Since candidates.json holds a 60-day rolling window (see prune.py), this is
a recent-coverage report, not a historical audit.

Two entry points:
- CLI (`uv run python -m src.coverage`): regenerate the report now.
- `refresh_if_due()`: called by the watchdog (health_check.py) — regenerates
  weekly and returns an alert string when recent T1 items are missing from
  the log in numbers that suggest curation is silently dropping events.

Run: uv run python -m src.coverage
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from src.dedup import normalize_url
from src.models import Article

_ROOT = Path(__file__).resolve().parent.parent.parent
LOG_PATH = _ROOT / "claude_pulse_log.md"
CANDIDATES_PATH = _ROOT / "data" / "candidates.json"
REPORT_PATH = _ROOT / "data" / "coverage_report.md"

REFRESH_INTERVAL = timedelta(days=7)
# Alert only on recent misses: older ones are usually deliberate editorial
# skips (寧缺勿濫) that would otherwise alarm forever.
ALERT_WINDOW_DAYS = 14
ALERT_T1_THRESHOLD = 5

logger = logging.getLogger("coverage")


def load_published_urls(log_path: Path = LOG_PATH) -> set[str]:
    """Normalized URLs from claude_pulse_log.md for membership checks."""
    if not log_path.exists():
        return set()
    urls: set[str] = set()
    for line in log_path.read_text().splitlines():
        if not line.startswith("| 20"):
            continue
        match = re.search(r"\|\s*(https?://[^\s|]+)\s*\|\s*$", line)
        if match:
            urls.add(normalize_url(match.group(1).strip()))
    return urls


def load_published_titles(log_path: Path = LOG_PATH) -> list[str]:
    """Summary text for fuzzy comparison. Splits on unescaped pipes only —
    summaries may contain literal "|" escaped as "\\|"."""
    if not log_path.exists():
        return []
    titles: list[str] = []
    for line in log_path.read_text().splitlines():
        if not line.startswith("| 20"):
            continue
        cells = [c.strip() for c in re.split(r"(?<!\\)\|", line) if c.strip()]
        # Schema v2: date | time | category | summary | source | url
        if len(cells) >= 4:
            titles.append(cells[3].lower())
    return titles


def load_candidates(candidates_path: Path = CANDIDATES_PATH) -> list[Article]:
    if not candidates_path.exists():
        return []
    return [Article.from_dict(d) for d in json.loads(candidates_path.read_text())]


_EMBEDDED_URL = re.compile(r"https?://[^\s\"'<>)]+")


def compute_missing(
    candidates: list[Article],
    published_urls: set[str],
    published_titles: list[str],
) -> list[Article]:
    missing: list[Article] = []
    for article in candidates:
        if normalize_url(article.url) in published_urls:
            continue
        # X posts announce events that get curated under their official URL
        # (editorial rule prefers anthropic.com over the post) — but the post
        # text embeds that URL. Treat an embedded published URL as covered.
        embedded = _EMBEDDED_URL.findall(f"{article.title} {article.summary_raw}")
        if any(normalize_url(u) in published_urls for u in embedded):
            continue
        # Fallback: rough title match for items where URL format differs
        title_lower = article.title.lower()
        if any(title_lower in pub for pub in published_titles):
            continue
        missing.append(article)
    return missing


def write_report(
    candidates: list[Article],
    missing: list[Article],
    report_path: Path = REPORT_PATH,
) -> None:
    lines = [
        "# Coverage Report — fetcher candidates vs published log",
        "",
        f"- Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
        f"- Candidates in window: **{len(candidates)}**",
        f"- Already published (URL match): **{len(candidates) - len(missing)}**",
        f"- Missing from published log: **{len(missing)}**",
        "",
        "## Missing items",
        "",
    ]

    by_tier: dict[str, list[Article]] = {}
    for article in sorted(missing, key=lambda a: a.published_at, reverse=True):
        by_tier.setdefault(article.tier, []).append(article)

    for tier in sorted(by_tier):
        lines.append(f"### {tier} — {len(by_tier[tier])} items")
        lines.append("")
        for article in by_tier[tier]:
            date = article.published_at.strftime("%Y-%m-%d %H:%M UTC")
            lines.append(f"- `{date}` [{article.source}] **{article.title}**")
            lines.append(f"  - {article.url}")
            if article.category_hint:
                lines.append(f"  - category_hint: `{article.category_hint}`")
        lines.append("")

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines))


def generate(
    log_path: Path = LOG_PATH,
    candidates_path: Path = CANDIDATES_PATH,
    report_path: Path = REPORT_PATH,
) -> list[Article]:
    """Regenerate the report; returns the missing items."""
    candidates = load_candidates(candidates_path)
    missing = compute_missing(
        candidates,
        load_published_urls(log_path),
        load_published_titles(log_path),
    )
    write_report(candidates, missing, report_path)
    logger.info(
        "Coverage: %d candidates, %d published, %d missing",
        len(candidates),
        len(candidates) - len(missing),
        len(missing),
    )
    return missing


def refresh_if_due(
    now: Optional[datetime] = None,
    log_path: Path = LOG_PATH,
    candidates_path: Path = CANDIDATES_PATH,
    report_path: Path = REPORT_PATH,
) -> Optional[str]:
    """Weekly report refresh. Returns an alert message when recent T1 misses
    exceed the threshold, else None (including when the report is fresh)."""
    now = now or datetime.now(timezone.utc)
    if report_path.exists():
        mtime = datetime.fromtimestamp(report_path.stat().st_mtime, tz=timezone.utc)
        if now - mtime < REFRESH_INTERVAL:
            return None

    missing = generate(log_path, candidates_path, report_path)

    # x.com is excluded from the alert count (still listed in the report):
    # official X posts usually duplicate an announcement already curated
    # under its anthropic.com URL, and posts without an embedded link can't
    # be matched against zh-TW summaries — they'd trip the threshold forever.
    window_start = now - timedelta(days=ALERT_WINDOW_DAYS)
    recent_t1 = [
        a
        for a in missing
        if a.tier == "T1"
        and a.source != "x.com"
        and a.published_at >= window_start
    ]
    if len(recent_t1) > ALERT_T1_THRESHOLD:
        return (
            f"{len(recent_t1)} T1 items from the last {ALERT_WINDOW_DAYS} days "
            f"are missing from the log — see data/coverage_report.md"
        )
    return None


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    generate()
    sys.exit(0)
