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
