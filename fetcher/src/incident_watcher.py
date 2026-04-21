from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from src.models import Article
from src.state import State

logger = logging.getLogger(__name__)

TRACKING_KEY = "incident_tracking"

_TIMESTAMP_LINE = re.compile(
    r"(?P<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+"
    r"(?P<day>\d{1,2})\s*,\s*"
    r"(?P<hour>\d{2}):(?P<minute>\d{2})\s+UTC\s+"
    r"(?P<label>Resolved|Investigating|Identified|Monitoring|Update|Completed)",
    re.IGNORECASE,
)

_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def parse_latest_status(summary_raw: str) -> Optional[str]:
    """Return the most recent status label ('Resolved' / 'Investigating' / etc.) or None."""
    match = _TIMESTAMP_LINE.search(summary_raw)
    if not match:
        return None
    return match.group("label").capitalize()


def parse_resolved_at(summary_raw: str, reference_year: int) -> Optional[datetime]:
    """Extract the Resolved timestamp. Atom summary lists events newest-first.

    `reference_year` is used because the feed omits year. Caller passes the
    incident's published year (or the current UTC year as fallback).
    """
    for match in _TIMESTAMP_LINE.finditer(summary_raw):
        if match.group("label").lower() != "resolved":
            continue
        month = _MONTHS[match.group("month").lower()]
        day = int(match.group("day"))
        hour = int(match.group("hour"))
        minute = int(match.group("minute"))
        return datetime(reference_year, month, day, hour, minute, tzinfo=timezone.utc)
    return None


class IncidentWatcher:
    """Detects status.claude.com incidents transitioning Investigating → Resolved.

    Writes resolution events to `pending_log_updates.json` so a Claude Code
    session can consume them and update published log entries.
    """

    def __init__(self, state: State, pending_updates_path: Path) -> None:
        self.state = state
        self.pending_updates_path = pending_updates_path

    def _load_tracking(self) -> dict:
        return self.state._data.setdefault(TRACKING_KEY, {})

    def _load_pending(self) -> list[dict]:
        if not self.pending_updates_path.exists():
            return []
        try:
            return json.loads(self.pending_updates_path.read_text())
        except json.JSONDecodeError:
            logger.warning("pending_log_updates.json corrupted, starting fresh")
            return []

    def _save_pending(self, updates: list[dict]) -> None:
        self.pending_updates_path.parent.mkdir(parents=True, exist_ok=True)
        self.pending_updates_path.write_text(
            json.dumps(updates, indent=2, ensure_ascii=False)
        )

    def watch(self, status_items: list[Article]) -> list[dict]:
        """Check each status incident; emit updates for newly-resolved ones."""
        tracking = self._load_tracking()
        pending = self._load_pending()
        existing_pending_guids = {u["guid"] for u in pending}
        new_updates: list[dict] = []

        for item in status_items:
            guid = item.guid
            if not guid:
                continue
            current_status = parse_latest_status(item.summary_raw)
            if not current_status:
                continue

            prior = tracking.get(guid, {})
            prior_status = prior.get("status")

            if prior_status and prior_status != "Resolved" and current_status == "Resolved":
                # State transition: record resolution event
                resolved_at = parse_resolved_at(
                    item.summary_raw, reference_year=item.published_at.year
                )
                started_at = item.published_at
                update = {
                    "guid": guid,
                    "title": item.title,
                    "url": item.url,
                    "started_at": started_at.isoformat(),
                    "resolved_at": resolved_at.isoformat() if resolved_at else None,
                    "detected_at": datetime.now(timezone.utc).isoformat(),
                }
                if guid not in existing_pending_guids:
                    new_updates.append(update)
                    logger.info(
                        "Incident resolved: %s (%s) — queued log update",
                        item.title,
                        guid,
                    )

            tracking[guid] = {
                "status": current_status,
                "title": item.title,
                "url": item.url,
                "started_at": item.published_at.isoformat(),
            }

        if new_updates:
            self._save_pending(pending + new_updates)

        return new_updates
