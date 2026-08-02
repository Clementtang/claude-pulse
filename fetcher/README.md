# Claude Pulse Fetcher

Python 3.12 + uv。定期抓 T1（與後續）來源，寫入 `data/candidates.json` 供 `/pulse-curate` 審閱；**不直接寫** `claude_pulse_log.md`。

## 狀態

已在 `main` 以 LaunchAgent 運行（約每 4 小時）。含 incident watcher、candidates 瘦身、coverage 週報。

## Setup

```bash
cd ~/claude-pulse/fetcher
uv sync
# 測試
uv sync --extra dev
uv run pytest
```

## 手動執行

```bash
uv run python -m src.main
```

## 資料流

```
T1 sources (GitHub releases / status.claude.com / anthropic.com / X via Nitter)
  → collectors → dedup → candidates.json（近 60 天）
  → 過舊進 candidates-archive.json
  → incident_tracking prune
  → （週）coverage_report.md + 異常通知
         ↓
  /pulse-curate 讀 candidates → 寫 claude_pulse_log.md + i18n
```

`data/` 預設 gitignore，僅本機與 LaunchAgent 使用。

## Incident watcher

`src/incident_watcher.py` 與 `claude_status` 同跑。狀態自非 Resolved → Resolved 時寫入 `data/pending_log_updates.json`。

`/pulse-curate` 開場應先消化 pending：依 URL 更新 log 進行中列，並同步 4 locale summary，再從 pending 移除。

已 Resolved 且不在 status feed 窗口內的 tracking key 會被 prune（fetch 失敗或空 feed 時不 prune）。

## 模組一覽

| 路徑 | 用途 |
| --- | --- |
| `src/main.py` | 入口 |
| `src/collectors/` | 各來源 |
| `src/dedup.py` | 去重 |
| `src/prune.py` | candidates / incident 瘦身 |
| `src/coverage.py` | candidates vs 已發布 log |
| `src/health_check.py` | watchdog + 週 coverage |
| `src/incident_watcher.py` | 狀態頁事件追蹤 |
| `tests/` | pytest |

## LaunchAgent

見 `INSTALL.md` 與 repo 內 `com.clementtang.claude-pulse-fetcher*.plist`。

## 相關文件

- 專案入口：[`../README.md`](../README.md)
- 變更紀錄：[`../CHANGELOG.md`](../CHANGELOG.md)
- 沿革：[`../docs/history.md`](../docs/history.md)
- 2026-04 研究稿（歷史）：[`../docs/architecture.md`](../docs/architecture.md)
