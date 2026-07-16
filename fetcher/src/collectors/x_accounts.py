from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

import feedparser

from src.models import Article

logger = logging.getLogger(__name__)

# X publishes no usable RSS and the API needs a paid tier, so we read through a
# Nitter mirror. Mirrors go offline without notice — try them in order and take
# the first that yields entries.
DEFAULT_INSTANCES = (
    "https://nitter.net",
    "https://nitter.poast.org",
    "https://xcancel.com",
)

# Handle → category_hint. None means "let curation decide" (these accounts post
# across research/industry/platform with no reliable per-account mapping).
DEFAULT_HANDLES = {
    "ClaudeDevs": "claude-code",
    "AnthropicAI": None,
    "claudeai": None,
}

_STATUS_RE = re.compile(r"/([^/]+)/status/(\d+)")
# Nitter prefixes replies with "R to @foo:" and retweets with "RT by @foo:".
_REPLY_RE = re.compile(r"^R to @", re.IGNORECASE)
_RETWEET_RE = re.compile(r"^RT by @", re.IGNORECASE)


class XAccountsCollector:
    """T1: official X accounts via Nitter RSS mirrors.

    Covers announcements that appear only on X and never reach
    status.claude.com or anthropic.com/news — rate limit resets being the
    recurring case.

    Only top-level posts are emitted. Thread bodies and retweets are dropped:
    the head post carries the announcement, and curation opens the URL to read
    the rest of the thread.
    """

    name = "x_accounts"
    tier = "T1"

    def __init__(
        self,
        handles: Optional[dict[str, Optional[str]]] = None,
        instances: tuple[str, ...] = DEFAULT_INSTANCES,
    ) -> None:
        self.handles = handles if handles is not None else dict(DEFAULT_HANDLES)
        self.instances = instances

    def collect(self) -> list[Article]:
        articles: list[Article] = []
        for handle, category_hint in self.handles.items():
            entries = self._fetch_handle(handle)
            for entry in entries:
                article = _to_article(entry, handle, category_hint, self.name, self.tier)
                if article:
                    articles.append(article)

        logger.info("%s returned %d items", self.name, len(articles))
        return articles

    def _fetch_handle(self, handle: str) -> list:
        """Return feed entries for one handle, trying each mirror in turn."""
        for instance in self.instances:
            url = f"{instance}/{handle}/rss"
            try:
                parsed = feedparser.parse(url)
            except Exception as e:  # noqa: BLE001 — a dead mirror must not kill the run
                logger.warning("%s: %s raised %s", self.name, url, e)
                continue

            if parsed.entries:
                logger.info("%s: %s returned %d entries", self.name, url, len(parsed.entries))
                return parsed.entries

            logger.warning(
                "%s: %s returned no entries (%s)",
                self.name,
                url,
                getattr(parsed, "bozo_exception", "empty feed"),
            )

        logger.error("%s: all mirrors failed for @%s — X scan incomplete", self.name, handle)
        return []


def _to_article(
    entry,
    handle: str,
    category_hint: Optional[str],
    collector_name: str,
    tier: str,
) -> Optional[Article]:
    title = (entry.get("title") or "").strip()
    if not title or _REPLY_RE.match(title) or _RETWEET_RE.match(title):
        return None

    published = _parse_dt(entry.get("published_parsed") or entry.get("updated_parsed"))
    if not published:
        return None

    url = _to_x_url(entry.get("link") or "")
    if not url:
        return None

    return Article(
        title=title,
        url=url,
        source="x.com",
        tier=tier,
        published_at=published,
        summary_raw=_strip_html(entry.get("summary", "")),
        guid=url,
        category_hint=category_hint,
        meta={"collector": collector_name, "handle": handle},
    )


def _to_x_url(nitter_link: str) -> Optional[str]:
    """Rewrite a Nitter status link to its canonical x.com form.

    The log records x.com URLs; a mirror URL would rot and would not dedup
    against entries added by hand from x.com.
    """
    match = _STATUS_RE.search(nitter_link)
    if not match:
        return None
    return f"https://x.com/{match.group(1)}/status/{match.group(2)}"


def _parse_dt(time_tuple) -> Optional[datetime]:
    if not time_tuple:
        return None
    try:
        return datetime(*time_tuple[:6], tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()
