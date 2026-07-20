"""Health check for claude-pulse-fetcher.

Two independent failure modes, two checks:

1. Liveness — `last_checked` older than STALE_THRESHOLD means the collector
   isn't running at all. Rationale: the fetcher LaunchAgent silently failed
   for 16 hours (04-20) when a branch switch removed fetcher/*.py.

2. Productivity — `last_run_with_new` far older than `last_checked` means the
   collector runs but never yields anything. Rationale: on 07-17 the
   x_accounts collector fetched 72 posts every run and dropped all of them at
   the state filter; it logged "returned 72 items" and reported 0 new, which
   is indistinguishable from a quiet news day. Nothing errored, nothing
   alerted, and it was found only by chance while adding accounts.

Both notify via osascript. Only liveness affects the exit code — a productive
silence is suspicious, not proof of failure.
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

# Per-collector "how long may this plausibly yield nothing before we suspect a
# silent drop?" There is no single threshold: claude_status can legitimately be
# quiet for days (no incidents), while x_accounts watches 8 active handles.
#
# Values are deliberately loose — a false alarm trains you to ignore the
# notification, which is worse than a late one. Derived from observed gaps in
# claude_pulse_log.md (2026-07), then rounded well past the longest.
#
# anthropic_news is exempt: its sitemap has no reliable publish dates, so most
# of its 400+ entries are historical pages and last_run_with_new only advances
# when something clears an already-high watermark — 53 days between advances
# while perfectly healthy. Checking it would fire constantly.
PRODUCTIVITY_THRESHOLD = {
    "github_releases": timedelta(days=7),  # observed max gap 93h
    "claude_status": timedelta(days=10),  # observed max gap 113h
    "x_accounts": timedelta(days=5),  # 8 active handles; quiet 5d is odd
}


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

    unproductive = find_unproductive(state, now)
    for name, age in unproductive:
        print(f"{name}: UNPRODUCTIVE (last_run_with_new {age} ago)")

    if stale_collectors:
        mac_notify(
            "Claude Pulse Fetcher stale",
            "; ".join(stale_collectors),
        )
        return 1

    if unproductive:
        mac_notify(
            "Claude Pulse fetcher yielding nothing",
            "; ".join(f"{name} ({age.days}d)" for name, age in unproductive)
            + " — running but never new; check for a silent drop",
        )

    return 0


def find_unproductive(state: dict, now: datetime) -> list[tuple[str, timedelta]]:
    """Collectors that run but haven't yielded a new item in too long.

    Returns (name, age) pairs. A collector is only flagged when it is
    currently alive — a dead one is already reported as STALE, and reporting
    both for the same collector would just be noise.
    """
    flagged: list[tuple[str, timedelta]] = []

    for name, threshold in PRODUCTIVITY_THRESHOLD.items():
        entry = state.get(name)
        if not entry:
            continue

        last_checked = entry.get("last_checked")
        if not last_checked or now - datetime.fromisoformat(last_checked) > STALE_THRESHOLD:
            continue  # dead or never run — the liveness check owns this case

        last_new = entry.get("last_run_with_new")
        if not last_new:
            continue  # never produced anything; nothing to compare against yet

        age = now - datetime.fromisoformat(last_new)
        if age > threshold:
            flagged.append((name, age))

    return flagged


def run_coverage_refresh() -> None:
    """Piggyback the weekly coverage refresh on the watchdog schedule.

    Separate from check() so the freshness contract (and its tests) stays
    free of coverage I/O; coverage problems notify but never affect the
    health exit code.
    """
    try:
        from src.coverage import refresh_if_due

        alert = refresh_if_due()
        if alert:
            mac_notify("Claude Pulse coverage", alert)
    except Exception as e:  # noqa: BLE001 — watchdog must survive coverage bugs
        logger.warning("coverage refresh failed: %s", e)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    exit_code = check()
    run_coverage_refresh()
    sys.exit(exit_code)
