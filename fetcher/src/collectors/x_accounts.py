from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import NamedTuple, Optional

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


class HandleConfig(NamedTuple):
    """Per-account settings.

    category_hint None means "let curation decide" — most of these accounts
    post across research/industry/platform with no reliable mapping.
    """

    category_hint: Optional[str]
    tier: str


# Handles are verified against the mirrors before being added here: a wrong
# handle yields an empty feed rather than an error, so it would sit in the
# rotation logging a mirror failure every run and never surface a post.
DEFAULT_HANDLES = {
    # Official channels — announcements land here first.
    "ClaudeDevs": HandleConfig("claude-code", "T1"),
    "AnthropicAI": HandleConfig(None, "T1"),
    "claudeai": HandleConfig(None, "T1"),
    # Individuals. Official-adjacent, but they mix product news with personal
    # opinion, so they don't carry first-party announcement weight — T2 keeps
    # the coverage report's T1 section meaning "official, check these".
    "bcherny": HandleConfig(None, "T2"),  # Boris Cherny, Claude Code
    "_catwu": HandleConfig(None, "T2"),  # Cat Wu, Head of Product (Code/Cowork)
    "trq212": HandleConfig(None, "T2"),  # Thariq, Claude Code
    "DarioAmodei": HandleConfig(None, "T2"),  # CEO
    "mikeyk": HandleConfig(None, "T2"),  # Mike Krieger, CPO
}

_STATUS_RE = re.compile(r"/([^/]+)/status/(\d+)")
# Nitter prefixes replies with "R to @foo:" and retweets with "RT by @foo:".
_REPLY_RE = re.compile(r"^R to @", re.IGNORECASE)
_RETWEET_RE = re.compile(r"^RT by @", re.IGNORECASE)


class XAccountsCollector:
    """Official X accounts and Anthropic staff, via Nitter RSS mirrors.

    Covers announcements that appear only on X and never reach
    status.claude.com or anthropic.com/news — rate limit resets being the
    recurring case — plus staff posts that trail product news.

    Only top-level posts are emitted. Thread bodies and retweets are dropped:
    the head post carries the announcement, and curation opens the URL to read
    the rest of the thread.
    """

    name = "x_accounts"
    # Protocol conformance / headline tier. Per-article tier comes from each
    # handle's HandleConfig — official channels are T1, individuals T2.
    tier = "T1"

    def __init__(
        self,
        handles: Optional[dict[str, HandleConfig]] = None,
        instances: tuple[str, ...] = DEFAULT_INSTANCES,
    ) -> None:
        self.handles = handles if handles is not None else dict(DEFAULT_HANDLES)
        self.instances = instances

    def collect(self) -> list[Article]:
        articles: list[Article] = []
        for handle, config in self.handles.items():
            entries = self._fetch_handle(handle)
            for entry in entries:
                article = _to_article(entry, handle, config, self.name)
                if article:
                    articles.append(article)

        # Merge the per-handle feeds into one newest-first stream. Every other
        # collector reads a single feed, so filter_already_seen assumes that
        # ordering and stops at the last-seen guid; handing it feeds
        # concatenated per handle made it stop inside the first account and
        # silently drop every later one.
        articles.sort(key=lambda a: a.published_at, reverse=True)

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
    config: HandleConfig,
    collector_name: str,
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
        tier=config.tier,
        published_at=published,
        summary_raw=_strip_html(entry.get("summary", "")),
        guid=url,
        category_hint=config.category_hint,
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
