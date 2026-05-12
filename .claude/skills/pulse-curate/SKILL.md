---
name: pulse-curate
description: Use when the user asks for Claude Pulse, latest Anthropic/Claude news, or recent updates. Supports interactive mode (default — presents candidates for review) and auto mode (--auto flag or non-TTY stdin — applies default rules and commits without confirmation). Suitable for LaunchAgent scheduling and cloud routine fallback.
---

# Pulse Curate

Anthropic / Claude 動態追蹤。搜尋最新消息，比對已知項目，只報告新動態，並發佈至 `https://claude-pulse.chatbot.tw/`。

## 模式判斷

- **Interactive mode**（預設）：呈現候選清單給使用者拍板「全收 / 拆 / 合 / 挑」，確認後才寫入
- **Auto mode**：套用預設規則自動決定，寫入 → commit + push → macOS notification

切換 trigger：

- `/pulse-curate --auto` 明示
- `claude -p "/pulse-curate"` 非互動 print mode（LaunchAgent / cron）
- stdin 非 TTY

## 相關檔案

| 用途              | 路徑                                                           |
| ----------------- | -------------------------------------------------------------- |
| Pulse Log         | `~/claude-pulse/claude_pulse_log.md`（repo 內，權威資料源）    |
| 4 locale 翻譯     | `~/claude-pulse/site/src/i18n/summaries-{en,zh-CN,ja,ko}.json` |
| 本地 fetcher 候選 | `~/claude-pulse/data/candidates.json`                          |
| Pending updates   | `~/claude-pulse/data/pending_log_updates.json`                 |
| Astro 站          | `~/claude-pulse/site/`                                         |
| Deploy            | push to `main` → GitHub Actions → CF Pages + GH Pages redirect |
| Auto mode log     | `~/.claude/logs/pulse-curate-out.log` / `pulse-curate-err.log` |

## 分類

| category      | 說明                         |
| ------------- | ---------------------------- |
| `claude-code` | Claude Code CLI 更新         |
| `platform`    | Claude Platform / API / 模型 |
| `research`    | 安全研究、alignment、論文    |
| `industry`    | 產業動態、競爭、法律         |
| `enterprise`  | 企業功能、定價、合作         |

## Log Schema v2

```
| date | time | category | summary | source | url |
```

- `date`：YYYY-MM-DD（事件發布或解除日期）
- `time`：HH:MM UTC（24h；無法確定用 `08:00` 預設）
- `category`：上表之一
- `summary`：繁體中文（台灣用語），資訊密度高，技術細節完整
- `source`：來源網域（如 `github.com`、`anthropic.com`、`bloomberg.com`、`finance.yahoo.com`）
- `url`：完整 URL（不能只填首頁）

## 流程

### 步驟 0：處理 pending incident updates

讀 `data/pending_log_updates.json`。若不存在或為空陣列直接跳到步驟 1。

對每筆 update：

- grep `claude_pulse_log.md` 找同 URL 的 in-progress 條目（通常含「進行中」字樣），用解除時間 / 總時長 / 影響範圍更新 summary
- 若 log 沒對應條目（incident started=resolved 同時間），WebFetch URL 取 timeline 後新增一筆 entry（同步 4 locale）
- 同步更新 `summaries-{en,zh-CN,ja,ko}.json` 對應 key
- 處理完從 pending 移除

全部處理完進入步驟 1。

### 步驟 1：讀 log 並取 baseline

- Read `claude_pulse_log.md`
- 記下表格最新日期作為搜尋起點
- 預先 grep 既有 URL set（去重用）：`grep -oE 'https://[^|]+' claude_pulse_log.md | sort -u`

### 步驟 2：讀本地 fetcher candidates

- Read `data/candidates.json`
- 過濾 `published_at >= 最新 log 日期` 的項目
- 依 source 分類：github.com（release）、status.claude.com（incident）、anthropic.com（sitemap）

**補位責任：** 若 `data/candidates.json` mtime > 6h（fetcher 可能未跑），fallback 自抓 atom：

- `https://github.com/anthropics/claude-code/releases.atom`
- `https://status.claude.com/history.atom`
- `https://www.anthropic.com/sitemap.xml`

寫入完成後在 stderr log 記錄「fetcher 異常 — 自抓補位 X 筆」供使用者事後檢視。

### 步驟 3：平行 WebSearch（T2 媒體 + engineering blog + X）

至少 6 個平行 WebSearch，分三層：

**第一層 — 官方來源**

- `Anthropic Claude news [month] [year]`
- `Claude Code latest version [month] [year]`
- `Anthropic announcements [recent dates] [year]`

**第二層 — 科技媒體**

- `Anthropic Claude site:techcrunch.com OR site:9to5mac.com OR site:theverge.com [month] [year]`
- `Anthropic Claude site:fortune.com OR site:bloomberg.com OR site:reuters.com [month] [year]`
- `Anthropic Claude site:axios.com OR site:wsj.com OR site:cnbc.com [month] [year]`

**第三層 — 市場與社群**

- `Anthropic Claude controversy OR backlash OR outage OR stock [recent dates] [year]`
- `site:anthropic.com/engineering [month] [year]`

**具名公司觸發詞**（補通用搜尋詞抓不到的）：

- `Anthropic [Akamai OR EPAM OR Microsoft OR Google OR SpaceX OR JPMorgan OR Amazon] [month] [year]`

視結果追加搜尋（產品細節、產業動態、GitHub issues 社群反應）。

### 步驟 4：URL 驗證與 fallback

每筆候選 WebFetch 確認：

1. HTTP 200
2. 頁面內容與 summary 相符（標題 / 日期 / 關鍵數字）
3. URL 是完整文章 URL 不是首頁

**Fallback 順序：**

1. WebFetch 直連
2. 失敗 (403/429) → 嘗試 Chrome MCP（`mcp__claude-in-chrome__navigate` + `get_page_text`）
3. Bloomberg / 主流站 Chrome MCP 也擋 → WebSearch 找 `finance.yahoo.com` / `investing.com` 等鏡像
4. 仍失敗 → 該筆 BLOCK，stderr log 記錄

### 步驟 5：去重 + 篩選

跟既有 URL set 比對，剃除重複。剩下為新動態候選。

**幾類必須排除（fetcher 職責，避免 routine 寫不存在的版本）：**

- `source = github.com` 且 URL 含 `/releases/tag/` → 已由步驟 2 從 candidates 取得，**步驟 3 不主動搜尋未公布版本**
- 模糊不清的 release / version：不寫
- 無可驗證 URL：不寫

無新動態 → 跳到步驟 9（無 commit）。

### 步驟 6：呈現候選（Interactive only）

依分類列出候選，每筆含日期、來源、簡述、URL。詢問使用者：

- 全收 / 挑 / 跳過
- 同事件多源是否拆兩筆
- 多筆同 (date, category, source) 是否要再拆

使用者拍板後進入步驟 7。

### 步驟 6'：套用 default rules（Auto only）

1. **全收原則**：所有通過 URL 驗證的候選預設全收
2. **同事件多源拆兩筆**：T1 官方（anthropic.com）+ T2 媒體拆兩筆 entries
3. **多筆同 base key**：自動計算 `#N` suffix（見步驟 7）
4. **URL 驗證失敗**：經過全部 fallback 仍失敗才 skip

### 步驟 7：寫入（Interactive + Auto 共通）

**a. 預計算 `#N` suffix**（避免 collision dedup bug — 參考 `memory/feedback_batch_write_n_suffix.md`）：

```python
from collections import Counter
seen = Counter()
for e in entries:  # entries 按 log file order（新→舊）排序
    base = f"{e['date']}|{e['category']}|{e['source']}"
    seen[base] += 1
    e['key'] = base if seen[base] == 1 else f"{base}#{seen[base]}"
```

**b. 寫 `claude_pulse_log.md`**：在表格 header + 分隔線後插入新 rows，按日期降序。

**c. 寫 4 locale JSON**：對每筆 entry 寫入 `summaries-{en,zh-CN,ja,ko}.json`，用步驟 a 的 `e['key']`，**新 entries 插在 OrderedDict 最前**（與 log file 順序對齊）。

**翻譯規則：**

- 保留版號、產品名、API、env var、URL、英文專有名詞
- zh-CN 用大陸用語（軟體→软件、檔案→文件、資料→数据、網路→网络、預設→默认、用戶→用户）
- ja 用中立禮體（する形結尾），技術術語保留英文/カタカナ
- ko 用書面語（ㅂ니다 風格或中立禮體）
- 每句結尾加標點（zh-CN 「。」、ja 「。」、ko 「.」、en 「.」）
- 保持 zh-TW 源文風格：簡潔、資訊密度高、技術細節完整

### 步驟 8：Commit + Push

```bash
cd ~/claude-pulse
git add claude_pulse_log.md site/src/i18n/
git commit -m "pulse: add N items YYYY-MM-DD..YYYY-MM-DD (短分類描述)"
git push origin main
```

GitHub Actions ~1 分鐘觸發 CF Pages + GH Pages redirect deploy。

### 步驟 9：完成處理

**Interactive mode**：直接報告新增項目（依分類）。

**Auto mode**：

1. echo 摘要到 `~/.claude/logs/pulse-curate-out.log`（含 commit hash、新增筆數、commit URL）
2. macOS notification：
   - 若 `terminal-notifier` 已安裝：
     ```bash
     terminal-notifier -title "Pulse" -message "+N 筆 YYYY-MM-DD" \
       -open "https://github.com/Clementtang/claude-pulse/commit/$(git rev-parse HEAD)"
     ```
   - 否則用 osascript（無 click action）：
     ```bash
     osascript -e 'display notification "+N 筆" with title "Pulse" subtitle "YYYY-MM-DD"'
     ```

3. 無新動態：echo 「沒有新動態」到 stdout log，**不發 notification**（避免 noise），exit 0

## 編輯原則

- **T1 官方優先**：anthropic.com/engineering > anthropic.com/news > claude.com/blog > github.com/anthropics > 媒體 > 社群
- **同事件可拆兩筆**：官方公告先、Bloomberg / 媒體解析後
- **寧缺勿濫**：今天沒可驗證新動態 → 「沒有新動態」 → 跳過 commit。不為了「有產出」而寫推測

## 反幻覺鐵律

- **唯一來源 of truth**：每條 entry 的內容與 URL 必須來自這次 session 的某個 WebFetch / WebSearch 結果
- **不要推測**：不「推斷」最近可能發生什麼。只寫看到的
- **寫入前必須 WebFetch URL 驗證 200 + 內容佐證**，失敗則經 fallback；fallback 全失敗則 BLOCK
- 未公布的 GitHub release version 一律不寫（曾踩坑，連續 3 天寫不存在的 v2.1.120）

## 繁中用語規則（zh-TW）

| 類別                    | 規則                                          |
| ----------------------- | --------------------------------------------- |
| 美國總統 Trump          | 「美國總統川普」                              |
| Department of War (DoW) | 「戰爭部」（不是國防部）                      |
| Pentagon                | 「五角大廈」                                  |
| 公司高層                | 補 title：「Anthropic 創辦人暨執行長 Amodei」 |
| 模型名稱                | 補性質：「Mythos 模型」、「Opus 4.7 模型」    |
| hang                    | 「卡住無回應」（不要用「掛起」）              |
| crash                   | 「當機」或「崩潰」                            |
| timeout                 | 「逾時」                                      |
| fallback                | 「備援」                                      |
| deprecated              | 「棄用」                                      |

避免中國大陸用語：信息→資訊、視頻→影片、用戶→使用者、軟件→軟體、默認→預設、文件（指 file）→檔案、在線→線上、質量→品質、激活→啟用、登錄→登入、賬號→帳號、通過→透過

**標點：**

- 中文句末用全形「，。」
- 中英文之間加半形空格（例：`Claude Code 2.1.97 — 修復...`）
- 「—」用 em dash（U+2014）

## Gotchas

1. **批次寫多筆同 (date, category, source) 必須先計算 #N suffix** — Python dict 第二次相同 key 會 skip；用 `Counter` 預算（見步驟 7a）
2. **Bloomberg 等主流媒體 403** — 必走 fallback 順序：WebFetch → Chrome MCP → Yahoo Finance 鏡像
3. **同 base key 順序**：log file 是日期降序，新 entry 在最頂，所以 base key 給「最新時間」的那筆，舊條目升 #2
4. **未公布的 GitHub release**：candidates.json 沒列的版本不寫，即使 WebSearch 看到 tag 也不能信
5. **commit-only-when-something-to-write**：無新動態時跳過 commit，不寫空 commit
