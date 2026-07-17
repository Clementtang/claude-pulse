from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.models import Article

logger = logging.getLogger(__name__)

# Curation only ever looks at candidates newer than the log's latest entry,
# so anything this old is long published (or consciously skipped). Keeping
# the working file small matters: /pulse-curate reads it into LLM context
# ~39 times a week.
CANDIDATE_MAX_AGE_DAYS = 60


def split_candidates(
    articles: list[Article],
    now: datetime | None = None,
    max_age_days: int = CANDIDATE_MAX_AGE_DAYS,
) -> tuple[list[Article], list[Article]]:
    """Split candidates into (kept, archived) by published_at age."""
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=max_age_days)
    kept: list[Article] = []
    archived: list[Article] = []
    for article in articles:
        (kept if article.published_at >= cutoff else archived).append(article)
    return kept, archived


def append_archive(articles: list[Article], archive_path: Path) -> int:
    """Append articles to the archive file, deduping by guid (url fallback).

    The archive is a write-only ledger — nothing in the fetch/curate path
    reads it. Returns the number of articles actually added.
    """
    if not articles:
        return 0

    existing: list[dict] = []
    if archive_path.exists():
        try:
            existing = json.loads(archive_path.read_text())
        except json.JSONDecodeError:
            logger.warning("candidates archive unreadable, starting fresh")

    seen = {entry.get("guid") or entry.get("url") for entry in existing}
    added = [a.to_dict() for a in articles if (a.guid or a.url) not in seen]
    if added:
        archive_path.parent.mkdir(parents=True, exist_ok=True)
        archive_path.write_text(
            json.dumps(existing + added, indent=2, ensure_ascii=False)
        )
    return len(added)


def prune_incident_tracking(tracking: dict, feed_guids: set[str]) -> int:
    """Drop Resolved incidents that have left the status feed window.

    Keeps unresolved entries regardless of age, and resolved ones still
    visible in the feed (so tracking mirrors the feed and re-sightings stay
    no-ops). Removing an entry cannot cause a duplicate pending update: the
    watcher's transition check requires a tracked non-Resolved prior status,
    and a pruned incident re-entering the feed arrives already Resolved.
    Callers must skip pruning when the status fetch failed or came back
    empty — an empty feed_guids set would wipe the whole resolved history.
    """
    stale = [
        guid
        for guid, entry in tracking.items()
        if entry.get("status") == "Resolved" and guid not in feed_guids
    ]
    for guid in stale:
        del tracking[guid]
    if stale:
        logger.info("Pruned %d resolved incidents from tracking", len(stale))
    return len(stale)
