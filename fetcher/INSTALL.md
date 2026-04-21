# Install / Manage LaunchAgent

The fetcher ships as a LaunchAgent that runs every 4 hours (local time),
writing raw candidates to `../data/candidates.json` and emitting resolution
events to `../data/pending_log_updates.json` when status.claude.com incidents
transition from Investigating → Resolved.

A second watchdog LaunchAgent runs every 2 hours and fires a macOS
notification if any collector's `last_checked` in `state.json` is older than
5 hours — catches the case where the main fetcher silently dies.

## Install

```bash
cp ~/claude-pulse/fetcher/com.clementtang.claude-pulse-fetcher.plist \
   ~/claude-pulse/fetcher/com.clementtang.claude-pulse-fetcher-watchdog.plist \
   ~/Library/LaunchAgents/

launchctl bootstrap gui/$(id -u) \
  ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher.plist
launchctl bootstrap gui/$(id -u) \
  ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher-watchdog.plist
```

## Check status

```bash
launchctl print gui/$(id -u)/com.clementtang.claude-pulse-fetcher
launchctl print gui/$(id -u)/com.clementtang.claude-pulse-fetcher-watchdog
```

## Tail logs

```bash
tail -f ~/.claude/logs/pulse-fetcher-err.log
tail -f ~/.claude/logs/pulse-watchdog-out.log
```

## Trigger manually

```bash
launchctl kickstart -k gui/$(id -u)/com.clementtang.claude-pulse-fetcher
launchctl kickstart -k gui/$(id -u)/com.clementtang.claude-pulse-fetcher-watchdog
```

## Uninstall

```bash
launchctl bootout gui/$(id -u) \
  ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher.plist
launchctl bootout gui/$(id -u) \
  ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher-watchdog.plist

rm ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher.plist
rm ~/Library/LaunchAgents/com.clementtang.claude-pulse-fetcher-watchdog.plist
```

## Review candidates

During Phase 2 evaluation, manually inspect:

```bash
cat ~/claude-pulse/data/candidates.json | jq '.[] | {title, source, published_at}' | head -40
```

After 2+ weeks of stable runs, Phase 3 will add LLM processing and start
publishing to `claude_pulse_log.md`.
