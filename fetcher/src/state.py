from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class State:
    """Persistent state for incremental fetching.

    Tracks per-collector last-seen GUID and timestamp so each run only
    processes new items.
    """

    def __init__(self, path: Path) -> None:
        self.path = path
        self._data: dict = {}
        if path.exists():
            try:
                self._data = json.loads(path.read_text())
            except json.JSONDecodeError:
                logger.warning("state.json corrupted, starting fresh")
                self._data = {}

    def get_last_seen(self, collector_name: str) -> dict:
        return self._data.get(collector_name, {})

    def update(self, collector_name: str, guid: str, published_at: datetime) -> None:
        entry = self._data.setdefault(collector_name, {})
        entry["last_guid"] = guid
        entry["last_published"] = published_at.isoformat()
        entry["last_run_with_new"] = datetime.now(timezone.utc).isoformat()

    def mark_checked(self, collector_name: str) -> None:
        """Record that collector ran, regardless of whether new items appeared.

        Lets monitoring distinguish `fetcher is alive but quiet` from `fetcher is dead`.
        """
        entry = self._data.setdefault(collector_name, {})
        entry["last_checked"] = datetime.now(timezone.utc).isoformat()

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2, ensure_ascii=False))

    def already_seen_guids(self, collector_name: str) -> set[str]:
        """Historical seen GUIDs — prevents re-processing even after GUID rotation.

        Currently returns only the last-seen GUID. Phase 3 may extend to keep
        a rolling window.
        """
        entry = self._data.get(collector_name, {})
        guid = entry.get("last_guid")
        return {guid} if guid else set()
