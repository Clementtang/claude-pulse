import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest

from src import health_check


@pytest.fixture
def fresh_state(tmp_path: Path, monkeypatch) -> Path:
    """State where all collectors checked within the last minute."""
    state_path = tmp_path / "state.json"
    now = datetime.now(timezone.utc).isoformat()
    state_path.write_text(
        json.dumps(
            {
                "github_releases": {"last_checked": now},
                "claude_status": {"last_checked": now},
                "anthropic_news": {"last_checked": now},
            }
        )
    )
    monkeypatch.setattr(health_check, "STATE_PATH", state_path)
    return state_path


@pytest.fixture
def stale_state(tmp_path: Path, monkeypatch) -> Path:
    """State where one collector hasn't checked in 10 hours."""
    state_path = tmp_path / "state.json"
    now = datetime.now(timezone.utc)
    stale = (now - timedelta(hours=10)).isoformat()
    fresh = now.isoformat()
    state_path.write_text(
        json.dumps(
            {
                "github_releases": {"last_checked": fresh},
                "claude_status": {"last_checked": stale},
                "anthropic_news": {"last_checked": fresh},
            }
        )
    )
    monkeypatch.setattr(health_check, "STATE_PATH", state_path)
    return state_path


@pytest.fixture
def missing_state(tmp_path: Path, monkeypatch) -> Path:
    state_path = tmp_path / "state.json"
    monkeypatch.setattr(health_check, "STATE_PATH", state_path)
    return state_path


def test_check_returns_zero_when_fresh(fresh_state: Path) -> None:
    with patch.object(health_check, "mac_notify") as mock_notify:
        assert health_check.check() == 0
        mock_notify.assert_not_called()


def test_check_returns_one_when_stale(stale_state: Path) -> None:
    with patch.object(health_check, "mac_notify") as mock_notify:
        assert health_check.check() == 1
        mock_notify.assert_called_once()
        call = mock_notify.call_args
        assert "claude_status" in call.args[1]


def test_check_handles_missing_state(missing_state: Path) -> None:
    with patch.object(health_check, "mac_notify") as mock_notify:
        assert health_check.check() == 1
        mock_notify.assert_called_once()


def test_check_ignores_incident_tracking_key(tmp_path: Path, monkeypatch) -> None:
    """incident_tracking is a dict of incidents, not a collector — should not be
    treated as stale even though it has no last_checked."""
    state_path = tmp_path / "state.json"
    now = datetime.now(timezone.utc).isoformat()
    state_path.write_text(
        json.dumps(
            {
                "github_releases": {"last_checked": now},
                "incident_tracking": {"some-guid": {"status": "Resolved"}},
            }
        )
    )
    monkeypatch.setattr(health_check, "STATE_PATH", state_path)

    with patch.object(health_check, "mac_notify") as mock_notify:
        assert health_check.check() == 0
        mock_notify.assert_not_called()


# --- productivity check: "runs but never yields" -----------------------------


def _state(**collectors) -> dict:
    return dict(collectors)


def _alive(**kwargs) -> dict:
    """A collector entry that passed its liveness check a minute ago."""
    entry = {"last_checked": datetime.now(timezone.utc).isoformat()}
    entry.update(kwargs)
    return entry


def test_should_flag_collector_when_alive_but_never_yields_new_items() -> None:
    """Reproduces 2026-07-17: x_accounts fetched 72 posts every run and dropped
    all of them at the state filter, reporting 0 new — indistinguishable from a
    quiet day. last_run_with_new stops advancing while last_checked keeps up.
    """
    now = datetime.now(timezone.utc)
    state = _state(
        x_accounts=_alive(last_run_with_new=(now - timedelta(days=9)).isoformat())
    )

    flagged = health_check.find_unproductive(state, now)

    assert [name for name, _ in flagged] == ["x_accounts"]


def test_should_not_flag_collector_when_recently_productive() -> None:
    now = datetime.now(timezone.utc)
    state = _state(
        x_accounts=_alive(last_run_with_new=(now - timedelta(hours=6)).isoformat())
    )

    assert health_check.find_unproductive(state, now) == []


def test_should_not_flag_dead_collector_twice() -> None:
    """A collector that isn't running is already reported as STALE; flagging it
    as unproductive too would be duplicate noise.
    """
    now = datetime.now(timezone.utc)
    state = _state(
        x_accounts={
            "last_checked": (now - timedelta(hours=30)).isoformat(),
            "last_run_with_new": (now - timedelta(days=30)).isoformat(),
        }
    )

    assert health_check.find_unproductive(state, now) == []


def test_should_exempt_anthropic_news_from_productivity_check() -> None:
    """Its sitemap has no reliable publish dates, so last_run_with_new only
    advances when an entry clears an already-high watermark — 53 days between
    advances while healthy (verified 2026-07-20: collector returned 415 items).
    """
    now = datetime.now(timezone.utc)
    state = _state(
        anthropic_news=_alive(last_run_with_new=(now - timedelta(days=60)).isoformat())
    )

    assert health_check.find_unproductive(state, now) == []
    assert "anthropic_news" not in health_check.PRODUCTIVITY_THRESHOLD


def test_should_use_per_collector_thresholds() -> None:
    """claude_status may be quiet for days with no incidents; x_accounts
    watching 8 active handles may not.
    """
    now = datetime.now(timezone.utc)
    seven_days = (now - timedelta(days=7)).isoformat()
    state = _state(
        claude_status=_alive(last_run_with_new=seven_days),  # under 10d limit
        x_accounts=_alive(last_run_with_new=seven_days),  # over 5d limit
    )

    assert [name for name, _ in health_check.find_unproductive(state, now)] == [
        "x_accounts"
    ]


def test_should_skip_collector_that_has_never_produced() -> None:
    now = datetime.now(timezone.utc)
    state = _state(x_accounts=_alive())

    assert health_check.find_unproductive(state, now) == []


def test_should_keep_exit_code_zero_when_only_unproductive(tmp_path, monkeypatch) -> None:
    """Productive silence is suspicious, not proof of failure — it notifies but
    must not make the watchdog report the fetcher as broken.
    """
    now = datetime.now(timezone.utc)
    state_path = tmp_path / "state.json"
    state_path.write_text(
        json.dumps(
            {"x_accounts": _alive(last_run_with_new=(now - timedelta(days=9)).isoformat())}
        )
    )
    monkeypatch.setattr(health_check, "STATE_PATH", state_path)

    with patch.object(health_check, "mac_notify") as notify:
        assert health_check.check() == 0
        assert notify.called
        assert "yielding nothing" in notify.call_args[0][0]
