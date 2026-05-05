# Claude Pulse 搬遷計畫

GitHub Pages → Cloudflare Pages，網域改為 `claude-pulse.chatbot.tw`，並補上 GA4 + GSC。

> 計畫建立日期：2026-05-05
> 狀態：待執行

---

## 1. 目標與動機

| 項目           | 現況                                  | 目標                                 |
| -------------- | ------------------------------------- | ------------------------------------ |
| 網域           | `clementtang.github.io/claude-pulse/` | `claude-pulse.chatbot.tw/`           |
| Hosting        | GitHub Pages                          | Cloudflare Pages                     |
| Astro `base`   | `/claude-pulse`                       | `/`（root）                          |
| 數據分析       | 無                                    | GA4                                  |
| SEO            | 無                                    | Google Search Console + sitemap 提交 |
| Bandwidth      | 100 GB/月軟上限                       | 無限                                 |
| CDN            | Fastly（亞洲節點稀疏）                | Cloudflare 330+ PoP（含河內）        |
| Preview deploy | 無                                    | 每個 PR 自動                         |

## 2. 前提確認（已完成）

| #   | 項目                         | 答案                                                                                             |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| 2.1 | `chatbot.tw` DNS 在哪？      | **Gandi**（NS = `ns-{20,39,197}-{a,b,c}.gandi.net`，registrar + DNS 都在 Gandi）                 |
| 2.2 | `chatbot.tw` root 目前指向？ | Facebook 社團（302 redirect）。維持現狀，後續可考慮 `fb.chatbot.tw` 收編                         |
| 2.3 | GA4 property 策略            | **新建 property「Claude Pulse」已完成** — Measurement ID `G-R69N8EZQE7`、Stream ID `14810473085` |
| 2.4 | GSC property                 | **已建立**，Thufir service account 已授權（為將來 programmatic 查詢 GSC API 鋪路）               |

## 3. 待執行步驟

### Phase 1：準備（零風險，可平行）

- [x] 1.1 GA4 property「Claude Pulse」已由使用者手動建立 — Measurement ID `G-R69N8EZQE7`，Stream ID `14810473085`
- [x] 1.2 GSC property 已由使用者手動建立，Thufir service account 已授權
- [ ] 1.3 把 `chatbot.tw` 從 Gandi 搬到 Cloudflare DNS：
  - 在 Cloudflare 加入 zone `chatbot.tw`
  - 把 Gandi 上現有的 DNS records（包括指向 FB 社團的 root）匯入 Cloudflare
  - 在 Gandi 把 NS 改為 Cloudflare 提供的 NS（生效 ~2-24h）
  - **Gandi 仍維持 registrar 角色，只是把 DNS 託管轉到 Cloudflare**
- [ ] 1.4 註冊 / 登入 Cloudflare Pages

> ⚠️ Phase 1.2 完成前，整個 chatbot.tw zone 都會跟著切，FB 社團的 redirect 也要在 Cloudflare 重做（HTTP redirect rule 或 page rule）。確認 redirect 在 Cloudflare 上正確再切 NS。

### Phase 2：Cloudflare Pages 部署（暫用 .pages.dev）

- [ ] 2.1 CF Pages → Create project → Connect to git → 選 `Clementtang/claude-pulse`
- [ ] 2.2 Build 設定：
  - Production branch: `main`
  - Build command: `cd site && npm install && npm run build`
  - Build output: `site/dist`
  - Node version: `20`
- [ ] 2.3 第一次 deploy → 取得 `claude-pulse-xxxx.pages.dev` 預設 URL
- [ ] 2.4 .pages.dev 暫不可訪問（因 Astro 還是 `base: "/claude-pulse"`），先確認 build 過、log 無錯

### Phase 3：Astro config 調整（branch `migrate/cloudflare-pages`）

- [ ] 3.1 `site/astro.config.mjs`：
  - `site: "https://claude-pulse.chatbot.tw"`
  - 移除 `base: "/claude-pulse"`
- [ ] 3.2 `grep -r "/claude-pulse" site/src` 找硬編碼路徑並修正
- [ ] 3.3 檢查 RSS / sitemap / parse-pulse.js / 任何 build script 是否假設 base path
- [ ] 3.4 本機 `cd site && npm run build`，確認 `dist/` 是 `dist/index.html` + `dist/zh-TW/index.html` 等（**不再有 `dist/claude-pulse/` 資料夾**）
- [ ] 3.5 push 到 `migrate/cloudflare-pages` branch → CF Pages 自動建 preview deployment
- [ ] 3.6 在 preview URL 驗證 5 locale + RSS + 內部連結正常

### Phase 4：加 GA4 + GSC 程式碼（同 branch）

- [ ] 4.1 確認 site 共用 layout 位置（預期 `site/src/layouts/Layout.astro` 或類似）
- [ ] 4.2 在 layout `<head>` 加 GA4 snippet（將 Measurement ID `G-R69N8EZQE7` 寫成 `import.meta.env.PUBLIC_GA_ID`，並在 CF Pages 環境變數 `PUBLIC_GA_ID=G-R69N8EZQE7` 設定，將來換 ID 不需動 code；本機 dev 可用 `.env.example` 文件記錄）：

```html
<!-- Google tag (gtag.js) -->
<script async src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.PUBLIC_GA_ID}`}></script>
<script is:inline define:vars={{ gaId: import.meta.env.PUBLIC_GA_ID }}>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', gaId);
</script>
```

- [ ] 4.3 GSC 已建立。從 GSC 取 DNS TXT 驗證字串 → Phase 5.2 一起加進 Cloudflare DNS（DNS 驗證比 HTML meta 好：換 hosting 不會掉）
- [ ] 4.4 在 preview deployment 用瀏覽器 DevTools 確認 GA4 `collect` request 有發出（Network filter `gtag` 或 `analytics`），且 Realtime 報表看到自己
- [ ] 4.5 Lighthouse 跑一次，確認 GA snippet 沒拖累 performance score（async 載入 + 無同步 blocking 應該沒問題）

### Phase 5：DNS 切換 + 自訂網域

- [ ] 5.1 Cloudflare DNS 加 CNAME：`claude-pulse` → `claude-pulse-xxxx.pages.dev`，**Proxy 開啟（橘雲）**，TTL 設 Auto
- [ ] 5.2 Cloudflare DNS 加 GSC TXT 驗證 record（位置看 GSC 給的指示，多半是 `chatbot.tw` root 或 `_google.claude-pulse.chatbot.tw`）
- [ ] 5.3 CF Pages → Project → Custom domains → Add `claude-pulse.chatbot.tw`
- [ ] 5.4 等 SSL active（~2-5 min）
- [ ] 5.5 `curl -I https://claude-pulse.chatbot.tw` 確認 200 + 正確 Content-Type
- [ ] 5.6 merge `migrate/cloudflare-pages` 到 `main` → CF Pages 自動部署到 production custom domain
- [ ] 5.7 GSC 完成 DNS 驗證 → 提交 sitemap：`https://claude-pulse.chatbot.tw/sitemap-index.xml`
- [ ] 5.8 GA4 Realtime 自己訪問驗證

### Phase 6：舊 GitHub Pages 收尾

- [ ] 6.1 在 `main` 建立新 GitHub Action job：deploy 到 GitHub Pages 時只放 redirect HTML（簡化版：root + 5 個 locale 各一個 meta-refresh + canonical 頁，指向新網域對應路徑）
- [ ] 6.2 或更簡單：直接停用 GitHub Pages、把 `clementtang.github.io/claude-pulse/` 設為 single redirect HTML（透過 commit 一個 `index.html` + `404.html` 都做 meta refresh 涵蓋多數情境）
- [ ] 6.3 GSC 對舊 property `clementtang.github.io/claude-pulse/` 提交 **Change of Address** → 新 property
- [ ] 6.4 30 天後檢查 GSC：新 domain 索引成長、舊 domain 流量歸零 → 完全關閉舊 GitHub Pages 部署

### Phase 7：周邊配套

- [ ] 7.1 README（如有）更新主 URL
- [ ] 7.2 Memory `project_status.md` 更新部署架構描述
- [ ] 7.3 Memory `architecture.md` 更新（GitHub Pages → CF Pages 段落）
- [ ] 7.4 Memory `MEMORY.md` 加一條 reference：「Deployment: CF Pages + claude-pulse.chatbot.tw + GA4」
- [ ] 7.5 Cloud routine（trig_011gxiDNLWLHuHGPjZBFh1Lm）prompt 用 `RemoteTrigger` 更新，確認無寫死舊 URL
- [ ] 7.6 LaunchAgent watchdog：不影響（不依賴外部 URL）
- [ ] 7.7 公開通知 RSS 訂閱者新 URL（site/feed.xml）— 透過寫一篇「搬家公告」式的 log entry，或在 README 強調

### Phase 8：完工驗證 checklist

- [ ] 8.1 5 locale 路徑（`/`、`/zh-TW/`、`/zh-CN/`、`/ja/`、`/ko/`）皆 200
- [ ] 8.2 `feed.xml` 正常產出，內含 URL 已是新網域
- [ ] 8.3 `sitemap-index.xml` + `sitemap-0.xml` 正確
- [ ] 8.4 GA4 Realtime 看到自己訪問（試 5 個 locale 都送 event）
- [ ] 8.5 GSC 驗證通過 + sitemap 已收
- [ ] 8.6 舊 URL `clementtang.github.io/claude-pulse/{path}` redirect 工作
- [ ] 8.7 HTTPS 憑證 valid（CF auto-provision Let's Encrypt）
- [ ] 8.8 從 X / LinkedIn 點外連測試（瀏覽器無 mixed content 警告）
- [ ] 8.9 Cloudflare Analytics 看到流量
- [ ] 8.10 Lighthouse SEO 分數 ≥ 90

## 4. 風險 & 回滾

| 風險                                                                   | 機率 | 影響 | 緩解 / 回滾                                                |
| ---------------------------------------------------------------------- | ---- | ---- | ---------------------------------------------------------- |
| Astro `base` 移除後內部連結壞                                          | 中   | 高   | Phase 3 嚴格本機 + preview 雙重驗證才動 DNS                |
| Phase 1.2 chatbot.tw NS 切到 Cloudflare 過程 FB 社團 redirect 短暫失效 | 中   | 低   | 在 Cloudflare 把 redirect 設好再切 NS；分一週前置          |
| DNS 切換過渡期 claude-pulse.chatbot.tw 短暫不可訪問                    | 低   | 低   | CNAME TTL 設 Auto / 300s                                   |
| GH Pages SEO 流量斷層                                                  | 中   | 中   | meta refresh + GSC Change of Address，30 天 transition     |
| GA4 measurement ID 寫錯 / 未啟用                                       | 低   | 低   | Phase 4 在 .pages.dev preview 先驗證 Realtime              |
| CF Pages build 失敗                                                    | 低   | 中   | 保留 GitHub Pages 部署直到 CF Pages 連續 7 天無事故才停    |
| Cloudflare zone 設定誤觸發 chatbot.tw FB redirect 壞                   | 低   | 中   | Phase 1.2 完成後立刻 curl 驗證 root domain redirect 仍正確 |

## 5. 預估時程

| 階段                  | 動手時間    | 等待時間（DNS / SSL / SEO） |
| --------------------- | ----------- | --------------------------- |
| Phase 1（含 NS 切換） | 30 min      | 2-24h DNS propagation       |
| Phase 2               | 30 min      | —                           |
| Phase 3               | 60 min      | —                           |
| Phase 4               | 30 min      | —                           |
| Phase 5               | 20 min      | 2-5 min SSL                 |
| Phase 6               | 30 min      | 14-30 天 SEO transition     |
| Phase 7               | 30 min      | —                           |
| Phase 8               | 30 min      | —                           |
| **總純動手**          | **~4 小時** | —                           |
| **總含等待**          | —           | **2-4 週完整生效**          |

## 6. 建議分批執行排程

| Session        | 內容                               | 何時                       |
| -------------- | ---------------------------------- | -------------------------- |
| S1（前置）     | Phase 1：GA4 + Cloudflare DNS 切換 | 週末上午                   |
| S2（核心遷移） | Phase 2 + 3 + 4 + 5                | 連續一個半天，避開週一週會 |
| S3（收尾）     | Phase 6 + 7 + 8                    | 切換後 1-3 天內            |
| S4（觀察）     | 確認 SEO transition、流量數據      | 切換後 30 天               |

## 7. Decision log（執行時填）

| 日期       | 決策                                              | 結果                                                                                             |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-05-05 | 域名選 `chatbot.tw`（vs `clementtang.net`）       | 主題契合度高、未來可擴 ai-pulse / openai-pulse                                                   |
| 2026-05-05 | Hosting 選 Cloudflare Pages（vs 留 GitHub Pages） | 河內 / 全球 CDN 速度、無頻寬上限、PR preview                                                     |
| 2026-05-05 | GA4 新 property（vs 共用）                        | claude-pulse 與 FB 社團內容性質差太多                                                            |
| 2026-05-05 | DNS 託管 Gandi → Cloudflare                       | CF Pages 整合 + DNS 操作介面更直觀                                                               |
| 2026-05-05 | GA4 + GSC 由使用者手動先建好                      | Measurement ID `G-R69N8EZQE7`、Stream `14810473085`；GSC property 含 Thufir service account 授權 |

---

**核准執行請回覆「同意執行」或指出需要修改的步驟。**
