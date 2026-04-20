from datetime import datetime, timezone
from pathlib import Path

import pytest

from src.incident_watcher import (
    IncidentWatcher,
    parse_latest_status,
    parse_resolved_at,
)
from src.models import Article
from src.state import State


@pytest.fixture
def tmp_state(tmp_path: Path) -> State:
    return State(tmp_path / "state.json")


@pytest.fixture
def tmp_pending(tmp_path: Path) -> Path:
    return tmp_path / "pending_log_updates.json"


def _mk(guid: str, summary_raw: str, published_at: datetime) -> Article:
    return Article(
        title="Elevated errors",
        url=f"https://status.claude.com/incidents/{guid}",
        source="status.claude.com",
        tier="T1",
        published_at=published_at,
        summary_raw=summary_raw,
        guid=guid,
    )


def test_parse_latest_status_returns_most_recent() -> None:
    s = (
        "Apr 20 , 00:00 UTC Resolved - This incident has been resolved. "
        "Apr 19 , 22:44 UTC Investigating - We are currently investigating this issue."
    )
    assert parse_latest_status(s) == "Resolved"


def test_parse_latest_status_ongoing() -> None:
    s = "Apr 20 , 06:14 UTC Investigating - We are currently investigating this issue."
    assert parse_latest_status(s) == "Investigating"


def test_parse_latest_status_none_when_missing() -> None:
    assert parse_latest_status("random text without timestamp") is None


def test_parse_resolved_at_extracts_utc_datetime() -> None:
    s = (
        "Apr 20 , 00:00 UTC Resolved - This incident has been resolved. "
        "Apr 19 , 22:44 UTC Investigating - We are currently investigating this issue."
    )
    resolved = parse_resolved_at(s, reference_year=2026)
    assert resolved == datetime(2026, 4, 20, 0, 0, tzinfo=timezone.utc)


def test_parse_resolved_at_returns_none_when_unresolved() -> None:
    s = "Apr 20 , 06:14 UTC Investigating - We are currently investigating this issue."
    assert parse_resolved_at(s, reference_year=2026) is None


def test_watch_skips_first_sighting(tmp_state: State, tmp_pending: Path) -> None:
    """First time we see an Investigating incident, no update emitted — only tracked."""
    watcher = IncidentWatcher(tmp_state, tmp_pending)
    item = _mk(
        "abc",
        "Apr 20 , 06:14 UTC Investigating - investigating.",
        datetime(2026, 4, 20, 6, 14, tzinfo=timezone.utc),
    )
    updates = watcher.watch([item])
    assert updates == []
    assert not tmp_pending.exists()


def test_watch_emits_update_on_resolution(tmp_state: State, tmp_pending: Path) -> None:
    watcher = IncidentWatcher(tmp_state, tmp_pending)
    started = datetime(2026, 4, 20, 6, 14, tzinfo=timezone.utc)

    # First run: sees Investigating, tracks it
    ongoing = _mk("abc", "Apr 20 , 06:14 UTC Investigating - ...", started)
    watcher.watch([ongoing])

    # Second run: now Resolved — must emit update
    resolved = _mk(
        "abc",
        "Apr 20 , 07:30 UTC Resolved - fixed. Apr 20 , 06:14 UTC Investigating - ...",
        started,
    )
    updates = watcher.watch([resolved])

    assert len(updates) == 1
    u = updates[0]
    assert u["guid"] == "abc"
    assert u["started_at"] == started.isoformat()
    assert u["resolved_at"] == datetime(2026, 4, 20, 7, 30, tzinfo=timezone.utc).isoformat()
    assert tmp_pending.exists()


def test_watch_does_not_double_emit(tmp_state: State, tmp_pending: Path) -> None:
    """Once queued in pending, a subsequent run shouldn't duplicate it."""
    watcher = IncidentWatcher(tmp_state, tmp_pending)
    started = datetime(2026, 4, 20, 6, 14, tzinfo=timezone.utc)

    ongoing = _mk("abc", "Apr 20 , 06:14 UTC Investigating - ...", started)
    watcher.watch([ongoing])

    resolved = _mk(
        "abc",
        "Apr 20 , 07:30 UTC Resolved - fixed. Apr 20 , 06:14 UTC Investigating - ...",
        started,
    )
    first = watcher.watch([resolved])
    second = watcher.watch([resolved])

    assert len(first) == 1
    assert second == []


def test_watch_skips_already_resolved_on_first_sighting(
    tmp_state: State, tmp_pending: Path
) -> None:
    """An incident that's already Resolved when we first see it isn't a transition."""
    watcher = IncidentWatcher(tmp_state, tmp_pending)
    item = _mk(
        "abc",
        "Apr 20 , 07:30 UTC Resolved - fixed. Apr 20 , 06:14 UTC Investigating - ...",
        datetime(2026, 4, 20, 6, 14, tzinfo=timezone.utc),
    )
    updates = watcher.watch([item])
    assert updates == []
