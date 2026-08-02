# Claude Pulse — Site

Astro 靜態站：5 locale、月/週 archive、RSS。部署至 Cloudflare Pages（主站）與 GitHub Pages（redirect shell）。

## Stack

- **Astro** 7.x（Node ≥ 22.12）
- `@astrojs/rss`、`@astrojs/sitemap`
- 資料源：repo 根目錄 `../claude_pulse_log.md` + `src/i18n/summaries-*.json`

## 指令

於 `site/` 目錄：

| Command | 說明 |
| --- | --- |
| `npm install` | 安裝依賴 |
| `npm run dev` | 本機開發伺服器 |
| `npm test` | 週分桶等 unit tests |
| `npm run build` | `validate-log` 後 `astro build` → `dist/` |
| `npm run preview` | 預覽 production build |

## 目錄結構（精簡）

```text
site/
├── public/           # robots, _headers, favicon, IndexNow key, …
├── scripts/
│   ├── validate-log.mjs
│   ├── indexnow-ping.mjs
│   ├── make-redirects.mjs
│   └── test-parse-pulse.mjs
└── src/
    ├── components/   # HomePage, ArchiveMonthHub, ArchivePage, Timeline, Footer
    ├── i18n/         # UI 字串 + summaries-*.json
    ├── layouts/Base.astro
    ├── lib/parse-pulse.js
    ├── pages/        # locale 路由 + feed.xml.js
    ├── scripts/      # home-client.js, archive-client.js（build 後 hashed）
    └── styles/archive-chrome.css
```

## 路由

| 路徑 | 內容 |
| --- | --- |
| `/`、`/{locale}/` | 首頁（近 14 天） |
| `/archive/YYYY-MM/` | 月份索引 |
| `/archive/YYYY-MM/wN/` | 週條目（w1=1–7 日 …） |
| `/feed.xml` | RSS（50 筆） |

en 無 prefix；其他 locale：`zh-TW`、`zh-CN`、`ja`、`ko`。

## 建置守門

`npm run build` 前置 `validate-log.mjs`：欄位、category、https URL、source/host 一致、IndexNow key 位元組、i18n 覆蓋。失敗則不部署。

## 相關文件

- 專案入口：[`../README.md`](../README.md)
- 變更紀錄：[`../CHANGELOG.md`](../CHANGELOG.md)
- 沿革：[`../docs/history.md`](../docs/history.md)
