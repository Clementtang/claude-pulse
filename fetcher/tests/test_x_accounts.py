import time
from datetime import datetime, timezone

from src.collectors import x_accounts
from src.collectors.x_accounts import XAccountsCollector, _to_x_url


def _entry(title: str, link: str, when: datetime, summary: str = "") -> dict:
    return {
        "title": title,
        "link": link,
        "summary": summary,
        "published_parsed": time.struct_time(when.timetuple()),
    }


def _feed(entries: list, bozo_exception=None):
    class Parsed:
        def __init__(self) -> None:
            self.entries = entries
            self.bozo = bool(bozo_exception)
            self.bozo_exception = bozo_exception

    return Parsed()


WHEN = datetime(2026, 7, 16, 3, 58, tzinfo=timezone.utc)
RESET = _entry(
    "We've reset 5-hour and weekly rate limits for all users.",
    "https://nitter.net/ClaudeDevs/status/2077603834453770467#m",
    WHEN,
)


def test_should_rewrite_nitter_link_to_canonical_x_url() -> None:
    assert (
        _to_x_url("https://nitter.net/ClaudeDevs/status/2077603834453770467#m")
        == "https://x.com/ClaudeDevs/status/2077603834453770467"
    )


def test_should_return_none_when_link_is_not_a_status_url() -> None:
    assert _to_x_url("https://nitter.net/ClaudeDevs") is None


def test_should_collect_top_level_post_when_feed_has_entries(monkeypatch) -> None:
    monkeypatch.setattr(x_accounts.feedparser, "parse", lambda url: _feed([RESET]))

    articles = XAccountsCollector(handles={"ClaudeDevs": "claude-code"}).collect()

    assert len(articles) == 1
    article = articles[0]
    assert article.url == "https://x.com/ClaudeDevs/status/2077603834453770467"
    assert article.source == "x.com"
    assert article.category_hint == "claude-code"
    assert article.published_at == WHEN
    assert article.meta["handle"] == "ClaudeDevs"
    # guid must be the canonical URL so hand-added x.com entries dedup against it
    assert article.guid == article.url


def test_should_skip_replies_and_retweets_when_feed_contains_thread_bodies(monkeypatch) -> None:
    entries = [
        RESET,
        _entry(
            "R to @ClaudeDevs: There's one more level above high...",
            "https://nitter.net/ClaudeDevs/status/2077603834453770468#m",
            WHEN,
        ),
        _entry(
            "RT by @ClaudeDevs: some third party post",
            "https://nitter.net/someone/status/2077603834453770469#m",
            WHEN,
        ),
    ]
    monkeypatch.setattr(x_accounts.feedparser, "parse", lambda url: _feed(entries))

    articles = XAccountsCollector(handles={"ClaudeDevs": None}).collect()

    assert [a.url for a in articles] == ["https://x.com/ClaudeDevs/status/2077603834453770467"]


def test_should_fall_back_to_next_mirror_when_first_returns_empty(monkeypatch) -> None:
    calls: list[str] = []

    def fake_parse(url: str):
        calls.append(url)
        if "dead.example" in url:
            return _feed([], bozo_exception=Exception("connection refused"))
        return _feed([RESET])

    monkeypatch.setattr(x_accounts.feedparser, "parse", fake_parse)

    articles = XAccountsCollector(
        handles={"ClaudeDevs": None},
        instances=("https://dead.example", "https://nitter.net"),
    ).collect()

    assert len(articles) == 1
    assert calls == [
        "https://dead.example/ClaudeDevs/rss",
        "https://nitter.net/ClaudeDevs/rss",
    ]


def test_should_return_empty_when_every_mirror_fails(monkeypatch) -> None:
    def boom(url: str):
        raise OSError("connection refused")

    monkeypatch.setattr(x_accounts.feedparser, "parse", boom)

    articles = XAccountsCollector(
        handles={"ClaudeDevs": None},
        instances=("https://a.example", "https://b.example"),
    ).collect()

    assert articles == []
