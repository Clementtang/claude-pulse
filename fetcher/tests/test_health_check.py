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
