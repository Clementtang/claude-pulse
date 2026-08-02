---
name: project-claude-pulse
description: Claude Pulse 架構演進、目前方案、已知限制 — Anthropic/Claude 動態追蹤系統
type: project
---

# Claude Pulse

Anthropic / Claude 動態自動追蹤系統。Fetcher 定期收候選 → curate 寫入 log → Astro 靜態站發布。

## 目前架構（2026-08-02）

| 元件 | 位置 | 說明 |
| --- | --- | --- |
| Pulse Log（權威來源） | `claude_pulse_log.md`（本 repo） | v2 表格：`date \| time UTC \| category \| summary \| source \| url` |
| 翻譯 | `site/src/i18n/summaries-{en,zh-CN,ja,ko}.json` | 原文 zh-TW 在 log；4 locale 摘要 JSON |
| 網站 | `site/`（Astro **7**） | Cloudflare Pages → `claude-pulse.chatbot.tw` |
| 舊網址 | GitHub Pages redirect shell | `clementtang.github.io/claude-pulse` |
| Fetcher | `fetcher/`（Python 3.12 + uv） | 每 4h LaunchAgent；candidates + incident watcher + prune + coverage |
| Curation | `.claude/skills/pulse-curate/` | interactive / auto；寫 log + i18n + commit/push |
| Deploy | `.github/workflows/deploy.yml` | build → IndexNow ping → GH Pages redirect shell |

### Log 格式（v2）

```
| date | time (HH:MM UTC) | category | summary | source | url |
```

category：`claude-code` / `platform` / `research` / `industry` / `enterprise`  
新列插在表格頂部，日期降序。summary 內 `|` 必須跳脫為 `\|`（build 會驗證）。

### 網站路由（5 locale）

| 路徑 | 內容 |
| --- | --- |
| `/` 與 `/{locale}/` | 首頁：近 14 天 + 篩選（分類 / 7–14 天 / 搜尋） |
| `/archive/YYYY-MM/` | 月份索引（各週連結；舊 `#anchor` 會導向週頁） |
| `/archive/YYYY-MM/wN/` | 週頁條目（月內週：1–7 → w1 …） |
| `/feed.xml` | RSS：最近 50 筆，permalink 指週頁 anchor |

en 無 path prefix；zh-TW / zh-CN / ja / ko 在 `/{locale}/` 下。

### 維運指令

```bash
# 站台
cd site && npm test && npm run build

# Fetcher
cd fetcher && uv run python -m src.main
cd fetcher && uv run pytest
```

---

## 架構演進

### Phase 1：手動執行（2026-03-19 ~ 03-22）

對話中手動 WebSearch → 比對 → 報告 → 更新 memory 純文字 log。

### Phase 2：Skill 化 + 排程嘗試（2026-03-25）

Skill + Remote Trigger / bridge（棄用）+ 本地 launchd 實驗後，改走 GitHub。

### Phase 3：GitHub + 結構化 log（2026-03-26）

Log 進 repo、Markdown 表格 + category；官方來源優先於 WebSearch。

### Phase 4：Astro 站 + Cloudflare（2026-04 ~ 05）

多 locale 靜態站、CF Pages、`claude-pulse.chatbot.tw`、GA4 / GSC；GH Pages 改 redirect shell。

### Phase 5：Fetcher v2 + pulse-curate（2026-04 ~ 06）

Python fetcher（T1 + 後續 X/Nitter）、LaunchAgent、incident watcher、`/pulse-curate` auto/interactive。

### Phase 6：可索引性與內容結構（2026-06 ~ 07）

- P0 可索引性修復、crawler guard
- P1 log 驗證 + 壞列修復
- P2 Bing / IndexNow
- P3 月 archive + permalink + JSON-LD
- P4–P6 / P8：RSS、站內搜尋、coverage、data 瘦身
- **2026-07-20**：SEO 方向收線（詳 improvement-proposals）

### Phase 7：頁重與週 archive（2026-07 末 ~ 08-02）

- 首頁 14 天、JSON-LD cap、字型/腳本/CSS 拆分與快取
- 月 archive 再拆**月內週**（非 ISO 全年週序，決策：對齊「按月回顧」）
- Astro 7.1 + audit 清零
- 變更明細：[`CHANGELOG.md`](../CHANGELOG.md)

---

## 已知限制

- **Curation 成本**：每筆 ×4 locale 翻譯仍是主要 recurring 成本；ja/ko 流量低但 07-20 決定保留
- **搜尋曝光**：Google 長期 not indexed；不再為 SEO 加碼
- **週切月界**：跨月連續事件會落在不同週頁（接受；不用 ISO week）
- **RSS guid**：2026-08 週路徑變更會讓訂閱端重標最近 50 筆未讀一次
- **Fetcher 環境**：LaunchAgent 依賴 Mac mini；coverage / watchdog 補觀測
- **本地 MCP**：`.mcp.json` 不進 git（本機覆寫）

---

## 相關文件

| 文件 | 用途 |
| --- | --- |
| [`CHANGELOG.md`](../CHANGELOG.md) | 近期變更 |
| [`README.md`](../README.md) | 專案入口 |
| [`docs/improvement-proposals-2026-07.md`](improvement-proposals-2026-07.md) | 2026-07 提案與 SEO 收線 |
| [`docs/architecture.md`](architecture.md) | 2026-04 可行性研究稿（非 living） |
| [`fetcher/README.md`](../fetcher/README.md) | Fetcher 說明 |
| [`site/README.md`](../site/README.md) | Astro 站說明 |
