# Changelog

本專案的使用者可見與維運相關變更紀錄。格式大致依 [Keep a Changelog](https://keepachangelog.com/)。  
更早的架構演進見 [`docs/history.md`](docs/history.md)；決策 snapshot 見 [`docs/plans/`](docs/plans/)。

## [Unreleased]

## [2026-08-02] — Site 效能與結構（週 archive、Astro 7）

### Added

- 月內週 archive：`/archive/YYYY-MM/` 為月份索引；條目在 `/archive/YYYY-MM/wN/`（display 日 1–7 → w1 …）
- 舊月頁 `#anchor` client redirect 至對應週頁
- RSS permalink 改指週頁（guid 一次性變更）
- Archive 週頁分類篩選（與關鍵字搜尋 AND）
- `site` 單元測試：`npm test`（week 分桶 helpers）
- 共用樣式：`styles/archive-chrome.css`、Base 內 filter / search chrome
- `_headers`：`/_astro/*` immutable 長快取

### Changed

- 首頁 SSR 視窗 30 天 → 14 天；JSON-LD 截斷前 20 筆
- Home / Archive client 腳本外掛為 hashed `/_astro/*.js`（`assetsInlineLimit: 0`）
- Locale-scoped Google Fonts（每頁只載當前 CJK face）
- Timeline 移除入場動畫；卡片 `content-visibility: auto`
- Source 連結圖示 emoji → SVG
- Astro 6.1 → 6.4 → **7.1.6**；`sharp` 0.35（`npm audit` 清零）
- 根 README 架構圖與 archive 路由說明

### Fixed

- 文件對齊：improvement-proposals 標 P1–P8 已出貨；architecture.md 標為歷史研究稿

### Chore

- `.mcp.json` 加入 `.gitignore`（本機 MCP 覆寫不進 repo）

## [2026-07-20] — SEO 方向收線

### Changed

- 停止為 Google 曝光加碼；P3 / P7 kill gate 撤銷
- 詳見 `docs/improvement-proposals-2026-07.md` 文末〈SEO 方向收線〉

## [2026-07-10] — P1 / P3 出貨

### Added

- Build-time log 驗證（`site/scripts/validate-log.mjs`）
- 月度 archive 頁 + per-item anchor + ItemList/NewsArticle JSON-LD（後於 2026-08 再拆週）

### Fixed

- 壞 log 列與 i18n 對齊問題（見 improvement-proposals P1 記錄）

## [2026-07] — P2 / P4–P6 / P8（摘要）

### Added

- Bing / IndexNow 推送與驗證
- 站內關鍵字搜尋（Home + Archive）
- Coverage report 排程（watchdog）
- Candidates / incident_tracking 瘦身（fetcher prune）

### Fixed

- RSS：最近 50 筆、真實 UTC 時間、穩定 archive permalink（後改週路徑）
