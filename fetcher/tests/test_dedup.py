from datetime import datetime, timezone

from src.dedup import dedup, normalize_url
from src.models import Article


def _mk(title: str, url: str, guid: str = "") -> Article:
    return Article(
        title=title,
        url=url,
        source="example.com",
        tier="T1",
        published_at=datetime(2026, 4, 16, tzinfo=timezone.utc),
        guid=guid or url,
    )


def test_normalize_url_strips_www_and_trailing_slash() -> None:
    assert normalize_url("https://www.example.com/news/x/") == "example.com/news/x"
    assert normalize_url("https://example.com/news/x") == "example.com/news/x"


def test_dedup_url_exact_match() -> None:
    articles = [
        _mk("First", "https://a.com/x"),
        _mk("Second", "https://www.a.com/x/"),  # same after normalize
    ]
    result = dedup(articles)
    assert len(result) == 1
    assert result[0].title == "First"


def test_dedup_fuzzy_title_match() -> None:
    articles = [
        _mk("Claude Code 2.1.110 released with /tui command", "https://a.com/1"),
        _mk("Claude Code 2.1.110 released with tui command", "https://b.com/2"),
    ]
    result = dedup(articles)
    assert len(result) == 1


def test_dedup_keeps_distinct() -> None:
    articles = [
        _mk("Release A", "https://a.com/1"),
        _mk("Totally different announcement", "https://b.com/2"),
    ]
    result = dedup(articles)
    assert len(result) == 2
