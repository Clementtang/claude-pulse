# Install / Manage LaunchAgent

## Phase 2 evaluation mode

The fetcher ships as a LaunchAgent that runs every 4 hours (local time),
writing raw candidates to `../data/candidates.json` without touching the
published `claude_pulse_log.md`.

## Install

```bash
cp ~/claude-pulse/fetcher/com.clementtang.claude-pulse-fetcher.plist \
   ~/Library/LaunchAgents/

launchctl bootstrap gui/$(id -u) \
  ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher.plist
```

## Check status

```bash
launchctl print gui/$(id -u)/com.clementtang.claude-pulse-fetcher
```

## Tail logs

```bash
tail -f ~/.claude/logs/pulse-fetcher-out.log
tail -f ~/.claude/logs/pulse-fetcher-err.log
```

## Trigger manually

```bash
launchctl kickstart -k gui/$(id -u)/com.clementtang.claude-pulse-fetcher
```

## Uninstall

```bash
launchctl bootout gui/$(id -u) \
  ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher.plist

rm ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher.plist
```

## Review candidates

During Phase 2 evaluation, manually inspect:

```bash
cat ~/claude-pulse/data/candidates.json | jq '.[] | {title, source, published_at}' | head -40
```

After 2+ weeks of stable runs, Phase 3 will add LLM processing and start
publishing to `claude_pulse_log.md`.
