import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.coverage import (
    compute_missing,
    load_published_titles,
    load_published_urls,
    refresh_if_due,
)
from src.models import Article

NOW = datetime(2026, 7, 17, 12, 0, tzinfo=timezone.utc)

LOG = """| date | time | category | summary | source | url |
| --- | --- | --- | --- | --- | --- |
| 2026-07-16 | 09:00 | platform | 多模型錯誤率事件 | status.claude.com | https://status.claude.com/incidents/abc |
| 2026-07-15 | 08:00 | claude-code | 設定（`a` \\|`b`）跳脫列 | github.com | https://github.com/anthropics/claude-code/releases/tag/v2.1.211 |
"""


def _mk(guid: str, url: str, tier: str = "T1", age_days: int = 1) -> Article:
    return Article(
        title=f"item {guid}",
        url=url,
        source="example.com",
        tier=tier,
        published_at=NOW - timedelta(days=age_days),
        guid=guid,
    )


def _write_fixtures(tmp_path: Path, candidates: list[Article]) -> tuple[Path, Path, Path]:
    log = tmp_path / "log.md"
    log.write_text(LOG)
    cand = tmp_path / "candidates.json"
    cand.write_text(json.dumps([a.to_dict() for a in candidates]))
    report = tmp_path / "coverage_report.md"
    return log, cand, report


def test_compute_missing_should_match_urls_ignoring_www_and_slash() -> None:
    published = {"status.claude.com/incidents/abc"}
    hit = _mk("x", "https://www.status.claude.com/incidents/abc/")
    assert compute_missing([hit], published, []) == []


def test_load_published_handles_escaped_pipe(tmp_path: Path) -> None:
    log = tmp_path / "log.md"
    log.write_text(LOG)
    urls = load_published_urls(log)
    assert "github.com/anthropics/claude-code/releases/tag/v2.1.211" in urls
    titles = load_published_titles(log)
    assert any("跳脫列" in t and "`a` \\|`b`" in t for t in titles)


def test_compute_missing_treats_embedded_published_url_as_covered() -> None:
    """An X post announcing an event curated under its official URL."""
    post = _mk("x1", "https://x.com/AnthropicAI/status/123")
    post.title = (
        "We're committing $10M CAD. https://www.anthropic.com/news/canadian-ai-research"
    )
    published = {"anthropic.com/news/canadian-ai-research"}
    assert compute_missing([post], published, []) == []


def test_compute_missing_title_fallback() -> None:
    candidate = _mk("t", "https://example.com/different-url")
    candidate.title = "跳脫列"
    missing = compute_missing([candidate], set(), ["設定（`a` \\|`b`）跳脫列"])
    assert missing == []


def test_refresh_if_due_skips_fresh_report(tmp_path: Path) -> None:
    log, cand, report = _write_fixtures(tmp_path, [])
    report.write_text("fresh")
    result = refresh_if_due(now=NOW, log_path=log, candidates_path=cand, report_path=report)
    assert result is None
    assert report.read_text() == "fresh"  # untouched


def test_refresh_if_due_alerts_on_recent_t1_misses(tmp_path: Path) -> None:
    misses = [_mk(f"m{i}", f"https://example.com/{i}", age_days=2) for i in range(6)]
    log, cand, report = _write_fixtures(tmp_path, misses)
    alert = refresh_if_due(now=NOW, log_path=log, candidates_path=cand, report_path=report)
    assert alert is not None and "6 T1" in alert
    assert report.exists()
    assert "Missing from published log: **6**" in report.read_text()


def test_refresh_if_due_ignores_old_misses(tmp_path: Path) -> None:
    misses = [_mk(f"m{i}", f"https://example.com/{i}", age_days=30) for i in range(6)]
    log, cand, report = _write_fixtures(tmp_path, misses)
    alert = refresh_if_due(now=NOW, log_path=log, candidates_path=cand, report_path=report)
    assert alert is None
    assert report.exists()  # report still regenerated


def test_refresh_if_due_no_alert_at_threshold(tmp_path: Path) -> None:
    misses = [_mk(f"m{i}", f"https://example.com/{i}", age_days=2) for i in range(5)]
    log, cand, report = _write_fixtures(tmp_path, misses)
    alert = refresh_if_due(now=NOW, log_path=log, candidates_path=cand, report_path=report)
    assert alert is None


def test_refresh_if_due_excludes_x_posts_from_alert_count(tmp_path: Path) -> None:
    x_posts = [_mk(f"x{i}", f"https://x.com/a/status/{i}", age_days=2) for i in range(10)]
    for post in x_posts:
        post.source = "x.com"
    log, cand, report = _write_fixtures(tmp_path, x_posts)
    alert = refresh_if_due(now=NOW, log_path=log, candidates_path=cand, report_path=report)
    assert alert is None
    assert "x.com" in report.read_text()  # still reported, just not alerted
