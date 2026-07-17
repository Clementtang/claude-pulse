import time
from datetime import datetime, timezone

from src.collectors import x_accounts
from src.collectors.x_accounts import HandleConfig, XAccountsCollector, _to_x_url


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

    articles = XAccountsCollector(handles={"ClaudeDevs": HandleConfig("claude-code", "T1")}).collect()

    assert len(articles) == 1
    article = articles[0]
    assert article.url == "https://x.com/ClaudeDevs/status/2077603834453770467"
    assert article.source == "x.com"
    assert article.category_hint == "claude-code"
    assert article.tier == "T1"
    assert article.published_at == WHEN
    assert article.meta["handle"] == "ClaudeDevs"
    # guid must be the canonical URL so hand-added x.com entries dedup against it
    assert article.guid == article.url


def test_should_return_newest_first_across_handles(monkeypatch) -> None:
    """filter_already_seen stops at the last-seen guid assuming one newest-first
    feed. Concatenating per-handle feeds made it stop inside the first account
    and drop every later one — the collector must merge them into one stream.
    """
    older = datetime(2026, 7, 16, 19, 37, tzinfo=timezone.utc)
    newer = datetime(2026, 7, 17, 1, 49, tzinfo=timezone.utc)

    def fake_parse(url: str):
        if "ClaudeDevs" in url:
            return _feed([_entry("official post", "https://nitter.net/ClaudeDevs/status/1#m", older)])
        return _feed([_entry("staff post", "https://nitter.net/_catwu/status/2#m", newer)])

    monkeypatch.setattr(x_accounts.feedparser, "parse", fake_parse)

    articles = XAccountsCollector(
        handles={
            "ClaudeDevs": HandleConfig("claude-code", "T1"),
            "_catwu": HandleConfig(None, "T2"),
        }
    ).collect()

    assert [a.published_at for a in articles] == [newer, older]


def test_should_survive_state_filter_when_watermark_is_an_earlier_handle(monkeypatch) -> None:
    """Regression: the first handle's newest post being the watermark must not
    drop the other handles' newer posts.
    """
    from src.dedup import filter_already_seen

    older = datetime(2026, 7, 16, 19, 37, tzinfo=timezone.utc)
    newer = datetime(2026, 7, 17, 1, 49, tzinfo=timezone.utc)
    watermark_url = "https://x.com/ClaudeDevs/status/1"

    def fake_parse(url: str):
        if "ClaudeDevs" in url:
            return _feed([_entry("official post", "https://nitter.net/ClaudeDevs/status/1#m", older)])
        return _feed([_entry("staff post", "https://nitter.net/_catwu/status/2#m", newer)])

    monkeypatch.setattr(x_accounts.feedparser, "parse", fake_parse)

    class FakeState:
        def get_last_seen(self, _name):
            return {"last_guid": watermark_url, "last_published": older.isoformat()}

    articles = XAccountsCollector(
        handles={
            "ClaudeDevs": HandleConfig("claude-code", "T1"),
            "_catwu": HandleConfig(None, "T2"),
        }
    ).collect()
    kept = filter_already_seen(articles, FakeState(), "x_accounts")

    assert [a.url for a in kept] == ["https://x.com/_catwu/status/2"]


def test_should_mark_article_t2_when_handle_is_an_individual(monkeypatch) -> None:
    monkeypatch.setattr(x_accounts.feedparser, "parse", lambda url: _feed([RESET]))

    articles = XAccountsCollector(handles={"bcherny": HandleConfig(None, "T2")}).collect()

    # Individuals must not land in the coverage report's T1 section alongside
    # official announcements.
    assert articles[0].tier == "T2"
    assert articles[0].category_hint is None


def test_should_carry_default_tiers_for_official_and_individual_handles() -> None:
    defaults = x_accounts.DEFAULT_HANDLES
    assert defaults["ClaudeDevs"].tier == "T1"
    assert defaults["bcherny"].tier == "T2"
    assert all(c.tier in ("T1", "T2") for c in defaults.values())


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

    articles = XAccountsCollector(handles={"ClaudeDevs": HandleConfig(None, "T1")}).collect()

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
        handles={"ClaudeDevs": HandleConfig(None, "T1")},
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
        handles={"ClaudeDevs": HandleConfig(None, "T1")},
        instances=("https://a.example", "https://b.example"),
    ).collect()

    assert articles == []
