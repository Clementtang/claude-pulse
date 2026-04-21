"""Health check for claude-pulse-fetcher.

Reads data/state.json and checks each collector's last_checked timestamp.
If any collector hasn't checked in within STALE_THRESHOLD, emit a macOS
notification via osascript.

Rationale: the fetcher LaunchAgent silently failed for 16 hours (04-20) when
the fetcher/*.py files were accidentally removed by a branch switch. A
separate watchdog gives us a user-visible signal that something is wrong.
"""

from __future__ import annotations

import json
import logging
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

STATE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "state.json"
# Fetcher runs every 4 hours; allow 1 hour buffer before alerting.
STALE_THRESHOLD = timedelta(hours=5)


def mac_notify(title: str, message: str) -> None:
    """Display a macOS notification. Silently skips on non-mac."""
    escaped_title = title.replace('"', '\\"')
    escaped_message = message.replace('"', '\\"')
    script = f'display notification "{escaped_message}" with title "{escaped_title}"'
    try:
        subprocess.run(
            ["osascript", "-e", script],
            check=True,
            capture_output=True,
            timeout=5,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired) as e:
        logger.warning("macOS notification failed: %s", e)


def check() -> int:
    """Return 0 if healthy, 1 if stale. Prints diagnostic line per collector."""
    if not STATE_PATH.exists():
        print(f"ERROR: state file missing at {STATE_PATH}")
        mac_notify(
            "Claude Pulse Fetcher",
            "state.json not found — fetcher may have never run.",
        )
        return 1

    try:
        state = json.loads(STATE_PATH.read_text())
    except json.JSONDecodeError as e:
        print(f"ERROR: state.json corrupt: {e}")
        mac_notify("Claude Pulse Fetcher", "state.json corrupt.")
        return 1

    now = datetime.now(timezone.utc)
    stale_collectors: list[str] = []

    for name, entry in state.items():
        if name == "incident_tracking":
            continue  # not a collector
        last_checked = entry.get("last_checked")
        if not last_checked:
            print(f"{name}: no last_checked yet (new collector?)")
            continue

        last_checked_dt = datetime.fromisoformat(last_checked)
        age = now - last_checked_dt
        status = "OK" if age <= STALE_THRESHOLD else "STALE"
        print(f"{name}: {status} (last_checked {age} ago)")
        if status == "STALE":
            stale_collectors.append(f"{name} ({age})")

    if stale_collectors:
        mac_notify(
            "Claude Pulse Fetcher stale",
            "; ".join(stale_collectors),
        )
        return 1

    return 0


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    sys.exit(check())
