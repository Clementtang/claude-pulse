# Claude Pulse

Anthropic / Claude 動態追蹤站。

- **網站**：<https://claude-pulse.chatbot.tw/>（Cloudflare Pages，2026-05-07 啟用）
- **舊網址**：<https://clementtang.github.io/claude-pulse/> 已改為 redirect-only shell，會自動跳轉至新網址；保留作為 SEO transition fallback（30-90 天觀察期）
- **資料源**：根目錄 `claude_pulse_log.md`（v2 schema：`date | time UTC | category | summary | source | url`）
- **5 locale**：原文 zh-TW、自動同步翻譯 en / zh-CN / ja / ko

## 架構快覽

```
T1 sources (GitHub releases / status.claude.com / anthropic.com sitemap)
  → fetcher (Python, 4h cadence via LaunchAgent)
  → data/candidates.json
  → 人工 curate
  → claude_pulse_log.md
  → Astro build (5 locale)
  → GitHub Pages
```

詳見 [`docs/architecture.md`](docs/architecture.md)。

## 文件導覽

| 文件                                           | 用途                             |
| ---------------------------------------------- | -------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | 系統架構（living document）      |
| [`docs/history.md`](docs/history.md)           | 專案沿革紀錄                     |
| [`docs/plans/`](docs/plans/)                   | 時間點 snapshot 計畫，依日期排序 |
| [`fetcher/README.md`](fetcher/README.md)       | Fetcher Python 服務說明          |

### 當前 active 計畫

- [`docs/plans/2026-05-05-cloudflare-migration.md`](docs/plans/2026-05-05-cloudflare-migration.md) — 搬遷至 Cloudflare Pages + `claude-pulse.chatbot.tw` + GA4 + GSC

## 文件規範

- 檔名一律 kebab-case（小寫 + 連字號），ASCII only
- 架構 / 當前狀態文件**無**日期前綴，靠 git history 追版本
- 計畫 / snapshot 文件**加** `YYYY-MM-DD-` 前綴並放 `docs/plans/`
- 計畫完成後不刪不改名 — 即時間紀錄；如要標狀態加 frontmatter `status: completed | active | abandoned`
