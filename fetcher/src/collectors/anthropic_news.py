from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional
from xml.etree import ElementTree as ET

import httpx

from src.models import Article

logger = logging.getLogger(__name__)


class AnthropicNewsCollector:
    """T1: Anthropic news via sitemap.xml polling.

    Anthropic has no RSS for /news. We fetch the sitemap, filter /news/* URLs,
    and use lastmod as published_at. Title comes from the URL slug (LLM can
    rewrite it later in Phase 3).
    """

    name = "anthropic_news"
    tier = "T1"

    def __init__(self) -> None:
        self.sitemap_url = "https://www.anthropic.com/sitemap.xml"
        self.ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    def collect(self) -> list[Article]:
        logger.info("Fetching %s", self.sitemap_url)
        try:
            response = httpx.get(
                self.sitemap_url,
                timeout=10,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (claude-pulse-fetcher/0.1)"},
            )
            response.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("Failed to fetch sitemap: %s", e)
            return []

        try:
            root = ET.fromstring(response.content)
        except ET.ParseError as e:
            logger.error("Failed to parse sitemap: %s", e)
            return []

        articles: list[Article] = []
        for url_node in root.findall("sm:url", self.ns):
            loc_node = url_node.find("sm:loc", self.ns)
            lastmod_node = url_node.find("sm:lastmod", self.ns)
            if loc_node is None or loc_node.text is None:
                continue
            loc = loc_node.text.strip()
            if "/news/" not in loc:
                continue
            lastmod = _parse_iso(lastmod_node.text) if lastmod_node is not None else None
            if not lastmod:
                continue

            slug = loc.rstrip("/").split("/")[-1]
            title = slug.replace("-", " ").title()
            articles.append(
                Article(
                    title=title,
                    url=loc,
                    source="anthropic.com",
                    tier=self.tier,
                    published_at=lastmod,
                    summary_raw="",  # Phase 3 will fetch the actual article content
                    guid=loc,
                    category_hint=None,  # Sonnet classifies in Phase 3
                    meta={"collector": self.name, "slug": slug},
                )
            )

        logger.info("%s returned %d items", self.name, len(articles))
        return articles


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        # sitemap lastmod may be YYYY-MM-DD or full ISO
        if "T" in value:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        else:
            dt = datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        return None
