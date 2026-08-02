# Claude Pulse

Anthropic / Claude 動態追蹤站。

- **網站**：<https://claude-pulse.chatbot.tw/>（Cloudflare Pages，2026-05-07 啟用）
- **舊網址**：<https://clementtang.github.io/claude-pulse/> 為 redirect-only shell（GitHub Actions 部署），自動跳轉至新網址
- **資料源**：根目錄 `claude_pulse_log.md`（v2 schema：`date | time UTC | category | summary | source | url`）
- **5 locale**：原文 zh-TW、自動同步翻譯 en / zh-CN / ja / ko
- **站台**：Astro 7 靜態站；首頁近 14 天、月索引 + 月內週 archive、RSS 50 筆

## 架構快覽

```
T1 sources (GitHub releases / status.claude.com / anthropic.com sitemap / X via Nitter)
  → fetcher (Python, 4h cadence via LaunchAgent)
  → data/candidates.json
  → /pulse-curate（interactive 或 auto）
  → claude_pulse_log.md + site/src/i18n/summaries-*.json
  → Astro build（5 locale + 月索引/週 archive + RSS）
  → Cloudflare Pages（主站）
     └─ GitHub Pages 僅 redirect shell
```

**Archive 路由**：`/archive/YYYY-MM/` 為月份索引；條目在 `/archive/YYYY-MM/wN/`（月內第 N 週，依 display 日 1–7… 切分）。舊的 `#anchor` 月連結會 client redirect 到對應週頁。

**現況權威文件**：本 README + [`docs/history.md`](docs/history.md) + [`CHANGELOG.md`](CHANGELOG.md)。  
[`docs/architecture.md`](docs/architecture.md) 為 2026-04 可行性研究稿，非 living architecture。

## 常用指令

```bash
# 站台
cd site && npm test && npm run build

# Fetcher
cd fetcher && uv run pytest
cd fetcher && uv run python -m src.main
```

## 文件導覽

| 文件 | 用途 |
| --- | --- |
| [`CHANGELOG.md`](CHANGELOG.md) | 近期變更（Keep a Changelog 風格） |
| [`docs/history.md`](docs/history.md) | 架構現況與沿革 |
| [`docs/architecture.md`](docs/architecture.md) | 2026-04 架構重構研究稿（歷史 snapshot） |
| [`docs/improvement-proposals-2026-07.md`](docs/improvement-proposals-2026-07.md) | 2026-07 改善提案；P1–P8 已出貨，SEO 已收線 |
| [`docs/plans/`](docs/plans/) | 時間點 snapshot 計畫 |
| [`site/README.md`](site/README.md) | Astro 站說明與指令 |
| [`fetcher/README.md`](fetcher/README.md) | Fetcher 服務說明 |

### 已完成（保留作紀錄）

- [`docs/plans/2026-05-05-cloudflare-migration.md`](docs/plans/2026-05-05-cloudflare-migration.md) — Cloudflare Pages + `claude-pulse.chatbot.tw` + GA4 + GSC（2026-05 完成）

## 文件規範

- 檔名一律 kebab-case（小寫 + 連字號），ASCII only
- 架構 / 當前狀態文件**無**日期前綴，靠 git history 追版本
- 計畫 / snapshot 文件**加** `YYYY-MM-DD-` 前綴並放 `docs/plans/`
- 計畫完成後不刪不改名 — 即時間紀錄；如要標狀態加 frontmatter `status: completed | active | abandoned`
- 使用者可見行為變更寫入 [`CHANGELOG.md`](CHANGELOG.md)；長線沿革寫入 [`docs/history.md`](docs/history.md)
