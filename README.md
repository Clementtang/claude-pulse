# Claude Pulse

Anthropic / Claude 動態追蹤站。

- **網站**：<https://claude-pulse.chatbot.tw/>（Cloudflare Pages，2026-05-07 啟用）
- **舊網址**：<https://clementtang.github.io/claude-pulse/> 為 redirect-only shell（GitHub Actions 部署），自動跳轉至新網址
- **資料源**：根目錄 `claude_pulse_log.md`（v2 schema：`date | time UTC | category | summary | source | url`）
- **5 locale**：原文 zh-TW、自動同步翻譯 en / zh-CN / ja / ko

## 架構快覽

```
T1 sources (GitHub releases / status.claude.com / anthropic.com sitemap / X via Nitter)
  → fetcher (Python, 4h cadence via LaunchAgent)
  → data/candidates.json
  → /pulse-curate（interactive 或 auto）
  → claude_pulse_log.md
  → Astro build（5 locale + archive + RSS）
  → Cloudflare Pages（主站）
     └─ GitHub Pages 僅 redirect shell
```

詳見 [`docs/architecture.md`](docs/architecture.md)（2026-04 可行性研究稿；現況以本 README 與 `docs/history.md` 為準）。

## 文件導覽

| 文件                                                                 | 用途                                       |
| -------------------------------------------------------------------- | ------------------------------------------ |
| [`docs/architecture.md`](docs/architecture.md)                       | 2026-04 架構重構研究稿（歷史 snapshot）    |
| [`docs/history.md`](docs/history.md)                                 | 專案沿革紀錄                               |
| [`docs/improvement-proposals-2026-07.md`](docs/improvement-proposals-2026-07.md) | 2026-07 改善提案；P1–P8 已出貨，SEO 已收線 |
| [`docs/plans/`](docs/plans/)                                         | 時間點 snapshot 計畫，依日期排序           |
| [`fetcher/README.md`](fetcher/README.md)                             | Fetcher Python 服務說明                    |

### 已完成（保留作紀錄）

- [`docs/plans/2026-05-05-cloudflare-migration.md`](docs/plans/2026-05-05-cloudflare-migration.md) — Cloudflare Pages + `claude-pulse.chatbot.tw` + GA4 + GSC（2026-05 完成）

## 文件規範

- 檔名一律 kebab-case（小寫 + 連字號），ASCII only
- 架構 / 當前狀態文件**無**日期前綴，靠 git history 追版本
- 計畫 / snapshot 文件**加** `YYYY-MM-DD-` 前綴並放 `docs/plans/`
- 計畫完成後不刪不改名 — 即時間紀錄；如要標狀態加 frontmatter `status: completed | active | abandoned`
