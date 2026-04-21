"""Coverage report: compare fetcher candidates against published log.

Answers: which fetcher-collected items are NOT yet in claude_pulse_log.md?
Used to evaluate whether the new fetcher would have caught events that
the legacy /claude-pulse skill missed.

Run: uv run python -m src.coverage
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from src.models import Article

LOG_PATH = Path(__file__).resolve().parent.parent.parent / "claude_pulse_log.md"
CANDIDATES_PATH = (
    Path(__file__).resolve().parent.parent.parent / "data" / "candidates.json"
)
REPORT_PATH = (
    Path(__file__).resolve().parent.parent.parent / "data" / "coverage_report.md"
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("coverage")


def load_published_urls() -> set[str]:
    """Extract all URLs from claude_pulse_log.md for fast membership check."""
    if not LOG_PATH.exists():
        return set()
    text = LOG_PATH.read_text()
    # URLs are the last column, format: `| ... | https://... |`
    urls: set[str] = set()
    for line in text.splitlines():
        if not line.startswith("| 20"):
            continue
        match = re.search(r"\|\s*(https?://[^\s|]+)\s*\|\s*$", line)
        if match:
            urls.add(match.group(1).strip())
    return urls


def load_published_titles() -> list[str]:
    """Extract summary text for fuzzy comparison."""
    if not LOG_PATH.exists():
        return []
    text = LOG_PATH.read_text()
    titles: list[str] = []
    for line in text.splitlines():
        if not line.startswith("| 20"):
            continue
        cells = [c.strip() for c in line.split("|") if c.strip()]
        # Schema v2: date | time | category | summary | source | url
        if len(cells) >= 4:
            titles.append(cells[3].lower())
    return titles


def load_candidates() -> list[Article]:
    if not CANDIDATES_PATH.exists():
        return []
    return [Article.from_dict(d) for d in json.loads(CANDIDATES_PATH.read_text())]


def is_published(article: Article, published_urls: set[str]) -> bool:
    """Check if candidate is already in published log by URL."""
    return article.url in published_urls


def run() -> int:
    candidates = load_candidates()
    published_urls = load_published_urls()
    published_titles = load_published_titles()

    missing: list[Article] = []
    for article in candidates:
        if is_published(article, published_urls):
            continue
        # Fallback: rough title match for items where URL format differs
        title_lower = article.title.lower()
        if any(title_lower in pub for pub in published_titles):
            continue
        missing.append(article)

    lines = [
        "# Coverage Report — fetcher candidates vs published log",
        "",
        f"- Candidates total: **{len(candidates)}**",
        f"- Already published (URL match): **{len(candidates) - len(missing)}**",
        f"- Missing from published log: **{len(missing)}**",
        "",
        "## Missing items (would have been captured by fetcher)",
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

    REPORT_PATH.write_text("\n".join(lines))
    logger.info("Report written: %s", REPORT_PATH)
    logger.info(
        "Candidates: %d | Published: %d | Missing: %d",
        len(candidates),
        len(candidates) - len(missing),
        len(missing),
    )
    return 0


if __name__ == "__main__":
    import sys

    sys.exit(run())
