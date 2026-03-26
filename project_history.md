---
name: project-claude-pulse
description: Claude Pulse 架構演進、目前方案、已知限制 — Anthropic/Claude 動態追蹤系統
type: project
---

# Claude Pulse

Anthropic / Claude 動態自動追蹤系統。每日排程搜尋新消息，比對已知項目，更新結構化 log。

## 目前架構（2026-03-26）

| 元件                  | 位置                                                               | 說明                                                  |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Pulse Log（權威來源） | `github.com/Clementtang/claude-pulse` / `claude_pulse_log.md`      | Markdown 表格，GitHub Scheduled Task 直接 commit push |
| Pulse Log（本地副本） | `~/.claude/projects/-Users-clementtang/memory/claude_pulse_log.md` | 手動同步，供本地 session 讀取用                       |
| Skill                 | `~/.claude/skills/claude-pulse/SKILL.md`                           | 手動執行時的流程定義                                  |
| Scheduled Task        | claude.ai/code/scheduled                                           | Daily 08:00 GMT+7, Sonnet 4.6, Default (cloud) 環境   |

### Log 格式

```
| YYYY-MM-DD | category | 繁體中文摘要（≤80字） | source.domain |
```

category 值：`claude-code` / `platform` / `research` / `industry` / `enterprise`
新項目插入表格頂部（header 之後），日期降序。

## 架構演進

### Phase 1：手動執行（2026-03-19 ~ 03-22）

在對話中手動觸發 WebSearch → 比對 → 報告 → 使用者確認後更新 memory 檔案。
Log 格式為純文字條列 `- YYYY-MM-DD | 摘要`。

### Phase 2：Skill 化 + 排程嘗試（2026-03-25）

**Skill 建立：** 將流程寫成 `~/.claude/skills/claude-pulse/SKILL.md`。

**Remote Trigger + Bridge（棄用）：**

- 透過 `RemoteTrigger` API 建立排程，使用 bridge 環境連到 Mac mini
- 問題：bridge 需要 `claude remote-control` 常駐，一個 bridge 同時只能服務一個 session
- 第一次測試卡住 30 分鐘 — 因為 bridge 被當前互動 session 佔用
- 換到另一個 bridge 後仍然失敗 — session 內容空白，agent 完全沒啟動
- 根本原因：沒有 remote control 進程在跑，bridge 無法接收連線
- **結論：** bridge 不穩定且會斷線，不適合排程場景

**本地 launchd（可行但棄用）：**

- `~/Library/LaunchAgents/com.clementtang.claude-pulse.plist`
- 用 `claude -p` print mode 執行，不需要互動
- 成功執行且結果正確
- 缺點：依賴 Mac mini 開機、無 git history、與雲端方案產生 log 分歧
- **結論：** 可行但不如 GitHub 方案

### Phase 3：GitHub Scheduled Task（最終方案，2026-03-26）

**決策：** 把 Pulse Log 放到 GitHub repo，用 claude.ai Scheduled Task + Default (cloud) 環境。

- 不依賴 bridge 或本地機器
- git history 自動追蹤變更
- claude.ai 介面可查看執行紀錄

**首次執行問題：** agent push 到 `master` 而非 `main`，手動修正後在 prompt 明確指定 `git push origin main`。

**Log 結構化：** 同時將 log 從純文字改為 Markdown 表格 + 分類欄位。

**資料來源改善（2026-03-26）：** prompt 改為先抓官方來源再用 WebSearch 補充，降低對 WebSearch 的依賴。

- 官方來源（WebFetch）：Claude Code Changelog、GitHub Releases、Anthropic Blog、Platform Release Notes
- WebSearch：補充產業動態、法律訴訟、市場數據等第三方消息
- **Why：** WebSearch 結果每次不同且可能遺漏，官方來源更穩定可靠

## 已知限制

- **本地副本同步：** GitHub 為權威來源，本地 memory 檔案需手動 pull 同步。手動執行 `/claude-pulse` 時會更新本地版本但不會 push 到 GitHub
- **WebSearch 不確定性：** 每次搜尋結果不同，不同 agent 可能各自抓到對方沒有的項目（曾發生本地 launchd 和 GitHub scheduled task 結果分歧）
- **雲端環境限制：** Default 環境無法存取本地檔案和 MCP servers
