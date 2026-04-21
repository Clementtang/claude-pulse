# Claude Pulse v2 架構重構 — 階段 1 報告

日期：2026-04-16  
狀態：研究階段，尚未動程式碼

---

## 1. 技術可行性驗證（每個來源）

### T1 官方（權威）

| 來源                 | 可用手段            | 驗證結果                                                        | 優先級 |
| -------------------- | ------------------- | --------------------------------------------------------------- | ------ |
| Anthropic `/news`    | sitemap.xml polling | ✅ 200 OK，XML sitemap 可用。需解析 `<loc>` 找 `/news/*` URL    | P0     |
| Anthropic X 官方     | Computer Use        | ⚠️ 無免費 API（X API Basic $200/月起），唯一可行為瀏覽器自動化  | P1     |
| Claude Status API    | `incidents.json`    | ⚠️ 200 OK 但 content-length: 0（CORS 防護）；用 summary.json 可 | P0     |
| GitHub releases      | `releases.atom`     | ✅ 200 OK，標準 Atom feed                                       | P0     |
| GitHub issues 高熱度 | REST API            | ✅ 需 `GITHUB_TOKEN`，查 `sort=reactions`，rate limit 5000/hr   | P1     |
| Claude Code docs     | HTML diff           | ⚠️ `code.claude.com/docs/whats-new` 有週報，無 RSS              | P2     |

### T2 科技媒體

| 來源            | RSS URL                                      | 驗證            | 頻寬 |
| --------------- | -------------------------------------------- | --------------- | ---- |
| TechCrunch      | `techcrunch.com/tag/anthropic/feed/`         | ✅              | 高   |
| The Verge       | `theverge.com/rss/index.xml`（全站，需過濾） | ✅              | 高   |
| The Information | —                                            | ❌ 付費牆無 RSS | —    |
| 9to5Mac         | `9to5mac.com/tag/anthropic/feed/`            | ✅ 301→works    | 中   |
| The Register    | `theregister.com/headlines.atom`（全站）     | ✅              | 高   |
| Ars Technica    | `feeds.arstechnica.com/arstechnica/index`    | ✅              | 高   |
| InfoQ           | `feed.infoq.com/ai-ml-data-eng/`             | ✅              | 中   |
| VentureBeat     | `venturebeat.com/category/ai/feed/`          | ✅              | 中   |

### T3 主流財經

| 來源      | 手段                                       | 狀態                                  |
| --------- | ------------------------------------------ | ------------------------------------- |
| Bloomberg | Google News RSS                            | ❌ 無公開主題 RSS；改走 T5            |
| FT        | Google News RSS                            | ❌ 付費牆                             |
| Nikkei    | Google News RSS                            | ❌ 付費牆；日文走 T5 `hl=ja`          |
| Reuters   | —                                          | ⚠️ `reutersagency.com/feed/` 部分可用 |
| WSJ       | —                                          | ❌ 付費牆                             |
| Fortune   | `fortune.com/feed/`                        | ✅ 301 有效                           |
| CNBC      | `cnbc.com/id/10000664/device/rss/rss.html` | ✅ AI 頻道                            |

**結論**：T3 多數無公開主題 RSS，統一走 T5 Google News RSS 抓標題與 URL。

### T4 社群

| 來源        | 方案               | 狀態                                          |
| ----------- | ------------------ | --------------------------------------------- |
| Grok        | xAI API `api.x.ai` | ⚠️ Premium $30/月不含 API；API 另計 $0.5/M in |
| Threads API | Meta Graph API     | ⚠️ 需 App Review 1-2 週；短期走 Computer Use  |
| X.com 搜尋  | Computer Use       | ✅ 可用 macOS Chrome 已登入 session           |

### T5 Google News RSS

| 語言  | URL                                                                            | 用途     |
| ----- | ------------------------------------------------------------------------------ | -------- |
| en    | `news.google.com/rss/search?q=Anthropic+Claude&hl=en`                          | 英文補遺 |
| zh-TW | `news.google.com/rss/search?q=Anthropic+Claude&hl=zh-TW&gl=TW&ceid=TW:zh-Hant` | 繁中補遺 |
| ja    | `news.google.com/rss/search?q=Anthropic+Claude&hl=ja&gl=JP&ceid=JP:ja`         | 日文補遺 |
| ko    | `news.google.com/rss/search?q=Anthropic+Claude&hl=ko&gl=KR&ceid=KR:ko`         | 韓文補遺 |

全部回 302 redirect 到 `consent.google.com`，需帶 `CONSENT=YES+cb` cookie 或走 `feed.googleusercontent.com/gn/` 變體。

---

## 2. Computer Use 可靠性評估

### X.com 自動化風險矩陣

| 風險                      | 嚴重度 | 緩解策略                                                       |
| ------------------------- | ------ | -------------------------------------------------------------- |
| 反爬偵測（Arkose/ROBLOX） | 高     | 使用 macOS Chrome 既有 profile，保留所有 cookies + fingerprint |
| Rate limit 軟封鎖         | 中     | 每次 session 最多 10 次 scroll，訪問間隔 3-8s 隨機             |
| Session 過期              | 中     | JWT 通常 30 天；設 cron 每週健康檢查                           |
| 2FA 挑戰                  | 低     | 現有 session 免重新登入；若失效通知人工                        |
| DOM 結構變動              | 中     | 用 data-testid 優先；fallback 用 OCR (Haiku)                   |

### Session 維持策略

1. **Chrome profile 持久化**：macOS `~/Library/Application Support/Google/Chrome/Default` 已登入
2. **Claude-in-Chrome MCP**：直接復用現有瀏覽器 session，避免自建 puppeteer
3. **錯誤通知**：失敗連續 3 次 → macOS `osascript` notification + log 到 `~/.claude/logs/pulse-err.log`
4. **降級**：若 X.com 連續 48 小時失敗，自動停用 T1.2 / T4.3，繼續其他層級

### 短期替代

若 Computer Use 過於脆弱，T1 X 時間軸可以先用：

- [RSSHub](https://rsshub.app/) 公開實例（但穩定性差、可能被封）
- Nitter 代理（多數實例已下線）
- 暫時放棄 X，只靠 T1 GitHub + sitemap.xml + T5 Google News

---

## 3. 實作語言選擇

### 比較

| 語言   | 生態系                                  | Computer Use              | 維護性 | 現有工具                                        |
| ------ | --------------------------------------- | ------------------------- | ------ | ----------------------------------------------- |
| Python | `feedparser`、`httpx`、`beautifulsoup4` | 間接（subprocess 呼 MCP） | 高     | `~/91app-brief` 已用 uv + httpx + anthropic SDK |
| Node   | `rss-parser`、`cheerio`                 | 直接（Playwright）        | 中     | `~/fremkit` 用 TS ESM                           |
| Shell  | `xmllint`、`curl`                       | 困難                      | 低     | —                                               |

### 推薦：**Python 3.12 + uv**

理由：

- 已有熟悉工具鏈（`~/91app-brief`）
- `feedparser` 處理 RSS/Atom 最完整
- `anthropic` SDK 原生支援 prompt caching
- Computer Use 透過 `subprocess` 呼叫 Claude Code 的 `mcp__claude-in-chrome__*`
- 專案結構建議：

```
~/claude-pulse/
├── fetcher/                      # 新增，Python
│   ├── pyproject.toml
│   ├── fetcher/
│   │   ├── __init__.py
│   │   ├── main.py               # 入口
│   │   ├── sources/
│   │   │   ├── t1_official.py
│   │   │   ├── t2_tech.py
│   │   │   ├── t3_mainstream.py
│   │   │   ├── t4_social.py
│   │   │   └── t5_google_news.py
│   │   ├── dedup.py
│   │   ├── llm.py                # Haiku/Sonnet 分派
│   │   └── publish.py            # 寫入 claude_pulse_log.md
│   └── uv.lock
├── site/                         # 現有 Astro
├── claude_pulse_log.md           # 現有
└── data/                         # 新增，.gitignore
    ├── raw/
    ├── state.json
    └── candidates.json
```

---

## 4. 模型分工成本試算

### 現況基線

- 每日 1 次 `/claude-pulse`，全 Sonnet 4.6
- 估 80k tokens/day = 64k in + 16k out
- 成本：(64 × $3 + 16 × $15) / 1000 = **$0.43/day ≈ $13/月**

### 新架構估算（6 次/天 + 模型分工）

**每次跑（平均）**：

| 階段             | 模型               | 輸入 tokens | 輸出 tokens | 成本/次    |
| ---------------- | ------------------ | ----------- | ----------- | ---------- |
| Feed 解析 + 去重 | Haiku 4.5          | 20,000      | 3,000       | $0.035     |
| Computer Use DOM | Haiku 4.5          | 15,000      | 2,000       | $0.025     |
| 摘要撰寫 + 分類  | Sonnet 4.6         | 15,000      | 4,000       | $0.105     |
| 英譯             | Haiku 4.5          | 8,000       | 2,000       | $0.018     |
| 重大事件審核     | Opus 4.6（僅觸發） | 5,000 × 10% | 1,000 × 10% | $0.015     |
| **每次小計**     |                    | **~63k**    | **~12k**    | **~$0.20** |

**每日 6 次**：~$1.20/day

**Prompt caching 折抵**（system prompt 20k tokens × 5 次 cache hit）：

- Sonnet cache read: 10% of input price = $0.30/MTok
- 節省：(20 × 5 × ($3 - $0.3)) / 1000 = $0.27/day

**淨成本**：~$0.93/day ≈ **$28/月**

### 對比

| 指標           | 現況  | 新架構 | 變化  |
| -------------- | ----- | ------ | ----- |
| 頻率           | 1×/天 | 6×/天  | +500% |
| 來源涵蓋       | ~5 個 | ~30 個 | +500% |
| 延遲           | 0-24h | 0-4h   | -83%  |
| 月成本         | $13   | $28    | +115% |
| 漏抓率（估算） | 30%   | <5%    | -83%  |

**ROI**：成本 2.15 倍，涵蓋 6 倍、延遲縮 6 倍。

### 進一步省錢選項

1. **只在檢測到新項目才呼叫 Sonnet 寫摘要**：若 6 次中 3 次無新內容，省 50% Sonnet → $20/月
2. **Opus 改為每週一次深度總結**（非每次觸發）：-$0.10/day → $25/月
3. **Google News RSS 結果不餵全文給 LLM**，只給 title + description：-30% input tokens → $22/月

**務實目標：$20-25/月**。

---

## 5. 儲存架構

### 建議分離

```
~/claude-pulse/
├── claude_pulse_log.md           # 已發表（權威、user-facing）
├── data/                         # .gitignore
│   ├── raw/
│   │   ├── github_releases.atom  # 最後一次抓取的 raw feed
│   │   ├── anthropic_sitemap.xml
│   │   ├── techcrunch.rss
│   │   └── ...
│   ├── state.json                # 各來源 last-seen GUID / timestamp
│   ├── candidates.json           # 已去重但未發表的項目（等 LLM 摘要）
│   └── rejected.log              # 曾處理但被判斷為雜訊的項目
└── site/
```

### state.json 範例

```json
{
  "github_releases": {
    "last_guid": "v2.1.110",
    "last_checked": "2026-04-16T07:00:00Z"
  },
  "techcrunch_anthropic": {
    "last_pubdate": "2026-04-15T22:30:00Z",
    "last_guid": "https://techcrunch.com/?p=2930145"
  }
}
```

### 去重流程

```
[各 source fetcher] → raw/*.feed
    ↓
[parser] → 依 state.json 過濾 → new_items[]
    ↓
[dedup by url_hash + fuzzy title] → candidates.json
    ↓
[LLM Sonnet 批次摘要 + 分類] → enriched[]
    ↓
[append] → claude_pulse_log.md
[update] → state.json
[git commit + push]
```

---

## 6. LaunchAgent vs /schedule 整合

### 現況

- 走 Claude Code `/schedule` skill 觸發的遠端 agent
- 每次整個 Claude Code session，含 SDK overhead

### 建議：**混合模式**

**LaunchAgent（每 4 小時）跑 Python fetcher**：

- 負責：RSS/Atom/sitemap 解析、state 管理、去重、呼 Anthropic SDK（Haiku 處理輕量任務）
- Cron：`StartCalendarInterval` 六個時段
- 不走 Claude Code session（省 overhead）

**/schedule 保留給重大事件通知**：

- 每天 1 次深度彙整（Opus 週報）
- 重大事件（如 outage、IPO 公告）觸發即時通知

**`/claude-pulse` slash command 改為手動補遺工具**：

- Daisy 執行時跑搜尋 + 人工確認
- 不再是主要資料管道

### LaunchAgent plist 範例

```xml
<key>StartCalendarInterval</key>
<array>
  <dict><key>Hour</key><integer>0</integer><key>Minute</key><integer>0</integer></dict>
  <dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>0</integer></dict>
  <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
  <dict><key>Hour</key><integer>12</integer><key>Minute</key><integer>0</integer></dict>
  <dict><key>Hour</key><integer>16</integer><key>Minute</key><integer>0</integer></dict>
  <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
</array>
<key>ProgramArguments</key>
<array>
  <string>/Users/clementtang/.local/bin/uv</string>
  <string>run</string>
  <string>--directory</string>
  <string>/Users/clementtang/claude-pulse/fetcher</string>
  <string>python</string>
  <string>-m</string>
  <string>fetcher.main</string>
</array>
```

時區：launchd 用 **本機時區（GMT+7 Hanoi）**，對應：

- 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 Hanoi time
- = 17:00, 21:00, 01:00, 05:00, 09:00, 13:00 UTC
- 覆蓋全球工作時段（尤其美西 PT 和歐洲 CET）

---

## 7. Prompt Caching 命中率估算

### 可 cache 的 system prompt（1 小時 TTL）

| 內容                         | 估計 tokens | 變動頻率   |
| ---------------------------- | ----------- | ---------- |
| 分類定義                     | 500         | 極少       |
| 繁中用語規則                 | 800         | 極少       |
| Schema 規格                  | 400         | 極少       |
| 近 30 天 log（供去重上下文） | 15,000      | 每次小更新 |
| 寫作風格範例                 | 2,000       | 極少       |
| **總計**                     | **~18,700** | —          |

### Cache hit 模擬（每日 6 次）

- Run 1（00:00）：冷啟，cache miss，寫入 cache
- Run 2（04:00）：4 小時差，cache 已過 1 小時 TTL，miss → 重寫
- **結論**：1 小時 TTL 對每 4 小時跑的場景無效

### 調整建議

選項 A：每 4 小時內多呼叫幾次 LLM（例如分批 20 項一次）→ 第一次後面的呼叫 cache hit

- 每次跑內部 3 批 → 2 次 cache hit → 省 33% system prompt tokens

選項 B：改用 Haiku 處理不需要大 system prompt 的部分（Haiku cache 便宜）

- 最高效

選項 C：申請 5 分鐘 TTL（預設）→ 跨批次 cache，適合單次跑內部

**推薦：A + B 組合**，每次跑 LLM 呼叫內分批（cache hit 率 ~66%）+ 輕量任務走 Haiku（cache 價差更划算）。

---

## 8. 風險評估

| 風險                            | 機率 | 影響 | 緩解                                                       |
| ------------------------------- | ---- | ---- | ---------------------------------------------------------- |
| Computer Use X.com 被封號       | 中   | 高   | 只讀不互動、保持 session 正常；降級到 Google News          |
| Anthropic sitemap 變動          | 低   | 中   | 加單元測試監控解析失敗                                     |
| GitHub API rate limit           | 低   | 低   | token 有 5000/hr，6 次 × 3 repos 遠低於                    |
| 成本失控（Opus 誤觸發）         | 低   | 中   | 設 daily cost ceiling，超過降級 Haiku                      |
| LaunchAgent 靜默失敗            | 中   | 高   | 每次跑結束寫 heartbeat；若 8 小時無更新通知                |
| 去重失誤導致重複發佈            | 中   | 中   | 雙層檢查（URL hash + title fuzzy）+ 發布前 git diff review |
| Google News consent cookie 失效 | 中   | 低   | 加 fallback user-agent；接受 T5 偶爾失靈                   |

---

## 9. 建議的下一步

### 階段 2（實作骨架，需你批准後執行）

1. 建立 `fetcher/` Python 專案（uv init）
2. 實作 T1：GitHub releases.atom + Anthropic sitemap.xml
3. 實作 `state.json` + 去重基礎邏輯
4. LaunchAgent 每 4 小時觸發（先不接 LLM，只收集 raw data）
5. 人工觀察 3 天，看 feed 命中率與誤判率

### 階段 3（擴展，階段 2 驗證後）

1. 接入 T2 所有 RSS
2. 接入 T5 Google News（多語）
3. 接入 Haiku 做摘要與英譯
4. Computer Use X.com 原型（T1 + T4）
5. Sonnet 整合摘要 + 分類
6. Prompt caching 實作

### 階段 4（社群 API，若前三階段成功）

1. 申請 Threads API（App Review）
2. 評估 Grok API 成本與效益
3. 週報 Opus 深度總結

---

## 10. 需要你決定的事

1. **Computer Use X.com 是否執行**？風險：X 政策變動可能封號
2. **Grok API 是否要訂 Premium+ 或單獨付費**？預算上限？
3. **Threads API 是否要申請**？App Review 需要我這邊準備 privacy policy 等
4. **每月成本上限**？$25-30 可否接受？
5. **fetcher 語言選 Python 還是你偏好 Node**？
6. **LaunchAgent 時區用本機（GMT+7）還是 UTC**？
7. **是否接受階段 2 不接 LLM，只收集 3 天 raw data 觀察**？
