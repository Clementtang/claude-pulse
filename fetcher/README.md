# Claude Pulse Fetcher (v2)

Phase 2 MVP — T1 sources only, no LLM. Collects raw feed data every 4 hours
and produces `data/candidates.json` for human review before publishing.

## Status: Development branch `v2-fetcher`

Production (`main`) still uses the legacy `claude-pulse` skill. This fetcher
will be evaluated for 2+ weeks before considering merge.

## Setup

```bash
cd ~/claude-pulse/fetcher
uv sync
```

## Run manually

```bash
uv run python -m src.main
```

## Architecture

See `../ARCHITECTURE_V2.md`.

## Data flow (Phase 2)

```
T1 sources → fetchers (raw) → dedup → candidates.json
                                         ↓
                              (human review / future LLM)
```

No writes to `claude_pulse_log.md` yet — that's Phase 3.

## Incident watcher

`src/incident_watcher.py` runs alongside `claude_status` on every fetch. It
tracks each status.claude.com incident's state across runs. When an incident
transitions from Investigating → Resolved, it appends a record to
`data/pending_log_updates.json`:

```json
[
  {
    "guid": "tag:status.claude.com,2005:Incident/...",
    "title": "Elevated errors on Opus 4.6",
    "url": "https://status.claude.com/incidents/...",
    "started_at": "2026-04-19T22:44:00+00:00",
    "resolved_at": "2026-04-20T00:00:00+00:00",
    "detected_at": "2026-04-20T08:00:06+00:00"
  }
]
```

### Consuming updates

A Claude Code session working on `claude-pulse` should check
`data/pending_log_updates.json` at the start of each session. For each pending
update, locate the matching log entry (same URL), update its summary with
the resolution time and total duration, and remove the entry from the
pending file once applied.

The watcher only captures **transitions** — an incident already resolved
when first observed is tracked but not emitted. This prevents historical
backfill noise. For pre-existing "進行中" entries that resolve before the
watcher starts tracking, manual update is required (one-off).
