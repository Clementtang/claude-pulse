import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.incident_watcher import IncidentWatcher
from src.models import Article
from src.prune import append_archive, prune_incident_tracking, split_candidates
from src.state import State

NOW = datetime(2026, 7, 17, 12, 0, tzinfo=timezone.utc)


def _mk(guid: str, age_days: int) -> Article:
    return Article(
        title=f"item {guid}",
        url=f"https://example.com/{guid}",
        source="example.com",
        tier="T1",
        published_at=NOW - timedelta(days=age_days),
        guid=guid,
    )


def test_split_candidates_should_archive_items_older_than_cutoff() -> None:
    fresh = _mk("fresh", age_days=10)
    old = _mk("old", age_days=90)
    kept, archived = split_candidates([fresh, old], now=NOW, max_age_days=60)
    assert kept == [fresh]
    assert archived == [old]


def test_split_candidates_should_keep_item_exactly_at_cutoff() -> None:
    boundary = _mk("boundary", age_days=60)
    kept, archived = split_candidates([boundary], now=NOW, max_age_days=60)
    assert kept == [boundary]
    assert archived == []


def test_append_archive_should_create_file_and_dedup_by_guid(tmp_path: Path) -> None:
    archive = tmp_path / "candidates-archive.json"

    first = append_archive([_mk("a", 90), _mk("b", 91)], archive)
    assert first == 2

    # Re-appending "a" is a no-op; "c" is added
    second = append_archive([_mk("a", 90), _mk("c", 92)], archive)
    assert second == 1

    stored = json.loads(archive.read_text())
    assert [e["guid"] for e in stored] == ["a", "b", "c"]


def test_append_archive_should_do_nothing_for_empty_input(tmp_path: Path) -> None:
    archive = tmp_path / "candidates-archive.json"
    assert append_archive([], archive) == 0
    assert not archive.exists()


def test_prune_incident_tracking_should_drop_only_resolved_outside_feed() -> None:
    tracking = {
        "in-feed-resolved": {"status": "Resolved"},
        "out-of-feed-resolved": {"status": "Resolved"},
        "out-of-feed-ongoing": {"status": "Investigating"},
    }
    removed = prune_incident_tracking(tracking, feed_guids={"in-feed-resolved"})
    assert removed == 1
    assert set(tracking) == {"in-feed-resolved", "out-of-feed-ongoing"}


def test_pruned_incident_reentering_feed_should_not_emit_pending_update(
    tmp_path: Path,
) -> None:
    """Prune safety: a pruned resolved incident re-sighted in the feed is a
    first sighting with status Resolved — no transition, no pending update."""
    state = State(tmp_path / "state.json")
    pending = tmp_path / "pending_log_updates.json"
    watcher = IncidentWatcher(state, pending)

    item = Article(
        title="Elevated errors",
        url="https://status.claude.com/incidents/abc",
        source="status.claude.com",
        tier="T1",
        published_at=NOW,
        summary_raw=(
            "Jul 17 , 07:30 UTC Resolved - fixed. "
            "Jul 17 , 06:14 UTC Investigating - investigating."
        ),
        guid="abc",
    )

    # Track it as resolved, then prune it (it left the feed window)
    watcher.watch([item])
    tracking = state._data["incident_tracking"]
    removed = prune_incident_tracking(tracking, feed_guids=set())
    assert removed == 1

    # It re-enters the feed already Resolved — must not emit an update
    updates = watcher.watch([item])
    assert updates == []
    assert not pending.exists()
