from __future__ import annotations

import logging
from difflib import SequenceMatcher
from urllib.parse import urlparse

from src.models import Article

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.85


def normalize_url(url: str) -> str:
    """Normalize URL for equality comparison — strip tracking params, trailing slash."""
    try:
        parsed = urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip("/")
        return f"{netloc}{path}"
    except ValueError:
        return url


def dedup(articles: list[Article]) -> list[Article]:
    """Remove duplicates within a single fetch run.

    Strategy:
    1. URL-normalized match → keep first (by list order)
    2. Title fuzzy match with SequenceMatcher ratio > SIMILARITY_THRESHOLD → keep first
    """
    seen_urls: set[str] = set()
    kept_titles: list[str] = []
    result: list[Article] = []

    for article in articles:
        url_key = normalize_url(article.url)
        if url_key in seen_urls:
            logger.debug("Dedup URL match: %s", article.title[:60])
            continue

        title_lower = article.title.lower().strip()
        is_dup = False
        for existing in kept_titles:
            if SequenceMatcher(None, title_lower, existing).ratio() > SIMILARITY_THRESHOLD:
                logger.debug("Dedup title fuzzy match: %s ~ %s", article.title[:60], existing[:60])
                is_dup = True
                break
        if is_dup:
            continue

        seen_urls.add(url_key)
        kept_titles.append(title_lower)
        result.append(article)

    logger.info("Dedup: %d → %d", len(articles), len(result))
    return result


def filter_already_seen(
    articles: list[Article], state, collector_name: str
) -> list[Article]:
    """Drop articles whose GUID matches state's last-seen for this collector.

    Uses both last_guid (exact) and last_published (timestamp gate).
    Articles older than last_published are dropped as already processed.
    """
    last = state.get_last_seen(collector_name)
    last_guid = last.get("last_guid")
    last_published_str = last.get("last_published")

    if not last_guid and not last_published_str:
        return articles

    last_published = None
    if last_published_str:
        from datetime import datetime

        try:
            last_published = datetime.fromisoformat(last_published_str)
        except ValueError:
            pass

    filtered = []
    for article in articles:
        if last_guid and article.guid == last_guid:
            break  # feed is ordered newest-first; stop at last-seen
        if last_published and article.published_at <= last_published:
            continue
        filtered.append(article)

    logger.debug("%s: %d → %d after state filter", collector_name, len(articles), len(filtered))
    return filtered
