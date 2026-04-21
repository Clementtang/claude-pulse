from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

import feedparser

from src.models import Article

logger = logging.getLogger(__name__)


class ClaudeStatusCollector:
    """T1: Anthropic service incidents via Statuspage Atom feed.

    Feed: https://status.claude.com/history.atom
    Covers: outages, partial disruptions, scheduled maintenance, post-mortems.
    """

    name = "claude_status"
    tier = "T1"

    def __init__(self) -> None:
        self.feed_url = "https://status.claude.com/history.atom"

    def collect(self) -> list[Article]:
        logger.info("Fetching %s", self.feed_url)
        parsed = feedparser.parse(self.feed_url)
        if parsed.bozo and not parsed.entries:
            logger.error("Failed to parse %s: %s", self.feed_url, parsed.bozo_exception)
            return []

        articles: list[Article] = []
        for entry in parsed.entries:
            published = _parse_dt(entry.get("updated_parsed") or entry.get("published_parsed"))
            if not published:
                continue
            articles.append(
                Article(
                    title=entry.get("title", "").strip(),
                    url=entry.get("link", "").strip(),
                    source="status.claude.com",
                    tier=self.tier,
                    published_at=published,
                    summary_raw=_strip_html(entry.get("summary", "")),
                    guid=entry.get("id") or entry.get("link", ""),
                    category_hint="platform",
                    meta={"collector": self.name},
                )
            )

        logger.info("%s returned %d items", self.name, len(articles))
        return articles


def _parse_dt(time_tuple) -> Optional[datetime]:
    if not time_tuple:
        return None
    try:
        return datetime(*time_tuple[:6], tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _strip_html(html: str) -> str:
    import re

    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()
