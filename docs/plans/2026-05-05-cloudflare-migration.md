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
| **DNS 託管**   | Gandi                                 | **不變，留 Gandi**（僅加一條 CNAME） |
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
- [ ] 1.3 註冊 / 登入 Cloudflare（純帳號動作，零 DNS 變更）

> **2026-05-06 路線變更：DNS 留 Gandi，不搬整個 zone**
>
> 原計畫把 chatbot.tw zone 整個搬到 Cloudflare 託管，reviewer 與 audit 過程都將此視為前提。User 在 2026-05-06 提問「乾脆全搬？」促使重新評估，發現：
>
> - Claude Pulse 是靜態站，**不需要** CF zone-level 功能（Workers / Email Routing / 全域 redirect rules）
> - chatbot.tw 已有 4 個 active subdomain（buddydex / events / qrcode / blog），整個搬遷的風險與收益不對等
> - CF Pages 的 SSL、custom domain、CDN、per-project Analytics、Preview deploy 全部都跟 DNS 託管在哪裡無關
> - 在 Gandi 加一條 CNAME + 一條 TXT 即可達成所有目標
>
> 決定改 **Option B**：DNS 全留 Gandi，僅在 Phase 5 於 Gandi 加 CNAME `claude-pulse.chatbot.tw` → CF Pages、加 TXT GSC 驗證。
>
> Phase 1.3 從「DNS zone 搬遷」簡化為「註冊 CF 帳號」。Phase 1 從半天工作量縮為 5 分鐘。原 Phase 1.3 的 DNS audit 工作仍保留為 [`docs/plans/2026-05-05-dns-audit.md`](2026-05-05-dns-audit.md)，作為 chatbot.tw 現況背景參考（Cloudflare zone records list 章節已不適用）。

> **[審查 2026-05-05]** PM：「把 Gandi 上現有的 DNS records 匯入 Cloudflare」假設 zone 內只有指向 FB 社團的 root record。
>
> **反證**：計畫沒有列出實際 zone audit 結果。常見遺漏的 record type：MX（email 收信）、SPF/DKIM/DMARC TXT（信件不被當垃圾郵件）、CAA（證書授權）。Cloudflare 自動 scan 並非 100% 命中，過去案例中 SPF / DKIM 常被漏。
>
> **影響**：若 `chatbot.tw` 有 email forwarding 或子網域服務，NS 切換後信件靜默退回或進垃圾桶，使用者可能要數天後才從錯過的回信發現。
>
> **修法**：在 Phase 1.3 開頭加一步「列出當前 Gandi 上所有 DNS records 並截圖」，用 `dig chatbot.tw ANY +noall +answer @ns-20-a.gandi.net`、`dig MX chatbot.tw`、`dig TXT chatbot.tw`、`dig CAA chatbot.tw` 三指令交叉確認。匯入後再 `dig` 一次新 NS 比對。
>
> **Severity**: HIGH

> **[審查 2026-05-05]** PM：警告框寫「Phase 1.2 完成前」但 1.2 是 GSC，DNS 切換是 1.3。
>
> **反證**：Phase 1 列表 1.1 GA4 / 1.2 GSC / 1.3 DNS / 1.4 CF Pages。文字應指 1.3。
>
> **影響**：執行時若依字面跳過驗證，可能在 redirect 還沒設好就切 NS，FB 社團 redirect 中斷。
>
> **修法**：把警告中的「Phase 1.2 完成前」改為「Phase 1.3 NS 切換前」。
>
> **Severity**: LOW

### Phase 2：Cloudflare Pages 部署（暫用 .pages.dev）

- [ ] 2.1 CF Pages → Create project → Connect to git → 選 `Clementtang/claude-pulse`
- [ ] 2.2 Build 設定：
  - Production branch: `main`
  - Build command: `cd site && npm install && npm run build`
  - Build output: `site/dist`
  - Node version: `22`（與 `site/package.json` `engines.node: >=22.12.0`、`.github/workflows/deploy.yml` `node-version: 22` 對齊）
- [ ] 2.3 第一次 deploy → 取得 `claude-pulse-xxxx.pages.dev` 預設 URL
- [ ] 2.4 .pages.dev 暫不可訪問（因 Astro 還是 `base: "/claude-pulse"`），先確認 build 過、log 無錯

> **[審查 2026-05-05]** 程式設計師：CF Pages Node version 設 `20`，但 `site/package.json` 的 `engines.node` 是 `>=22.12.0`。
>
> **反證**：`site/package.json:6` 寫 `"node": ">=22.12.0"`；`.github/workflows/deploy.yml:27` 用 `node-version: 22`。Astro 6.x 對 Node 20 仍兼容，但 `engines` 一旦執行 `npm install` 會 warn / 在 strict 模式下失敗（CF Pages 預設嚴格度未確認）。
>
> **影響**：build 可能首次成功但出 warning 被忽略；若 CF Pages 啟用 `engine-strict` 或 npm 11+ 預設行為改變，build 直接 fail。即使 build 成功，未來相依 Node 22 ESM 特性的程式碼會在 prod 出錯而本機跑不出來。
>
> **修法**：CF Pages Build 設定改 Node `22`（與 GH Actions 一致），或把 `engines.node` 放寬到 `>=20.0.0` 並在三處（CF Pages / GH Actions / package.json）統一文件化。
>
> **Severity**: HIGH

### Phase 3：Astro config 調整（branch `migrate/cloudflare-pages`）

- [ ] 3.1 `site/astro.config.mjs`：
  - `site: "https://claude-pulse.chatbot.tw"`
  - 移除 `base: "/claude-pulse"`
- [ ] 3.2 跑 `grep -rn "claude-pulse" site/src`（**注意：無 leading slash**），確認以下已知必改檔案 + 過濾 false positive：
  - **必改**：`site/src/pages/feed.xml.js:16` — `link: \`${context.site}claude-pulse/#...\`` → 移除字串中的 `claude-pulse/`，改為 `link: \`${context.site}#...\``（注意 context.site 是否已含 trailing slash，inline 驗證）
  - **False positive 可忽略**：`site/src/components/HomePage.astro:188` GitHub repo URL、`HomePage.astro:218,242` localStorage key
- [ ] 3.3 檢查 `parse-pulse.js`、build script、`HomePage.astro` 等任何 build-time 邏輯是否假設 base path 存在

> **[審查 2026-05-05]** 程式設計師：3.2 的 grep pattern `/claude-pulse`（slash 在左）會漏抓 `site/src/pages/feed.xml.js:16` 的硬編碼。
>
> **反證**：`feed.xml.js:16` 寫 `link: \`${context.site}claude-pulse/#${...}\``，原始字串是 `claude-pulse/`（slash 在右），與 grep 的 `/claude-pulse`（slash 在左）不對稱。`grep -rn "/claude-pulse" site/src`親自跑過確認只命中`HomePage.astro`的`localStorage`key 與 GitHub repo URL，**沒有** 命中`feed.xml.js`。
>
> **影響**：RSS 所有 item link 變成 `https://claude-pulse.chatbot.tw/claude-pulse/#...`，全部 404。RSS 訂閱者點任何項目都死站。
>
> **修法**：把 grep 改為 `grep -rn "claude-pulse" site/src`（無 slash）+ 人工濾掉 GitHub repo URL 與 localStorage key 等 false positive。或直接列出已知需改檔案：`feed.xml.js:16` 的 `claude-pulse/` 必須移除（context.site 已含 trailing slash 視 Astro 行為而定，要 inline 驗證）。
>
> **Severity**: HIGH

> **[審查 2026-05-05]** 程式設計師：3.3 列「sitemap」假設它已存在，但目前根本沒有 sitemap。
>
> **反證**：`site/package.json` 沒有 `@astrojs/sitemap` 相依（grep 為 0 命中），`site/src/pages/` 下沒有 `sitemap.xml.js`，`site/dist/` 也沒有 `sitemap*` 檔案。Phase 5.7「提交 sitemap：`https://claude-pulse.chatbot.tw/sitemap-index.xml`」與 Phase 8.3「sitemap-index.xml + sitemap-0.xml 正確」都會失敗。
>
> **影響**：Phase 5.7 GSC 提交失敗，Phase 8.3 驗證失敗，但這發生在 DNS 切換後。整個遷移看似完成、實際 SEO 工具鏈缺一塊；GSC 沒 sitemap 索引速度大幅下降，可能延遲新網域 indexing 1-2 週。
>
> **修法**：在 Phase 3 新增一步「3.7 安裝並設定 `@astrojs/sitemap` integration」：`cd site && npm install @astrojs/sitemap`，在 `astro.config.mjs` import 並加入 `integrations: [sitemap()]`，build 後驗證 `dist/sitemap-index.xml` 存在再進入 Phase 4。
>
> **Severity**: CRITICAL

- [ ] 3.4 **新增 sitemap**（目前無）：
  - `cd site && npm install @astrojs/sitemap`
  - `astro.config.mjs` import 並加入 `integrations: [sitemap()]`
  - 本機 build 後驗證 `dist/sitemap-index.xml` + `dist/sitemap-0.xml` 產出
- [ ] 3.5 本機 `cd site && npm run build`，確認 `dist/` 是 `dist/index.html` + `dist/zh-TW/index.html` 等（**不再有 `dist/claude-pulse/` 資料夾**）；驗證 `dist/feed.xml` 內 `<link>` 是新網域格式
- [ ] 3.6 push 到 `migrate/cloudflare-pages` branch → CF Pages 自動建 preview deployment
- [ ] 3.7 在 preview URL 驗證 5 locale + RSS + sitemap + 內部連結正常

### Phase 4：加 GA4 + GSC 程式碼（同 branch）

- [ ] 4.1 在 `site/src/layouts/Base.astro` 的 `<head>` 區（預期 19-37 行間，inline 確認位置）插入 GA4 snippet

> **[審查 2026-05-05]** 程式設計師：layout 檔名實際是 `Base.astro`，不是 `Layout.astro`。
>
> **反證**：`site/src/layouts/` 目錄只有 `Base.astro`；`HomePage.astro:2` import `Base from "../layouts/Base.astro"`。Architecture memory 也明確記載 `layouts/Base.astro`。
>
> **影響**：執行時若按字面找 `Layout.astro` 找不到會 stuck；小 friction 但顯示這份計畫沒有對應現有 codebase 寫成。
>
> **修法**：把 4.1 改為「在 `site/src/layouts/Base.astro` 的 `<head>` 區（19-37 行間）加 GA4 snippet」。
>
> **Severity**: LOW

- [ ] 4.2 GA4 snippet 直接 hardcode Measurement ID（避免 env var silent failure）：

```html
<!-- Google tag (gtag.js) -->
<script
  async
  src="https://www.googletagmanager.com/gtag/js?id=G-R69N8EZQE7"
></script>
<script is:inline>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag("js", new Date());
  gtag("config", "G-R69N8EZQE7");
</script>
```

> **設計決策**：reviewer 提出 env var 方式有 silent failure 風險（`PUBLIC_GA_ID` 未設時 build 不 fail、ship `id=undefined` 到生產、Network 200 但 0 event collect、本人測試會誤判通過）。Claude Pulse 只有 1 個 GA ID 且不會頻繁換，hardcode 比 env var 安全許多；將來真要環境隔離，PR 改 1 行即可。

- [ ] 4.3 GSC 已建立。從 GSC 取 DNS TXT 驗證字串 → Phase 5.2 一起加進 Cloudflare DNS（DNS 驗證比 HTML meta 好：換 hosting 不會掉）
- [ ] 4.4 在 preview deployment 用瀏覽器訪問後，**到 GA4 → Realtime 報表確認看到自己訪問**（不是只看 Network filter `gtag` 200，否則 `id=undefined` case 會誤判）
- [ ] 4.5 Lighthouse 跑一次，確認 GA snippet 沒拖累 performance score（async 載入 + 無同步 blocking 應該沒問題）

> **[審查 2026-05-05]** 程式設計師：4.2 的 GA snippet 在 `PUBLIC_GA_ID` 環境變數未設定時會靜默 ship `id=undefined` 到生產。
>
> **反證**：`import.meta.env.PUBLIC_GA_ID` 在 build time resolve；若 CF Pages env vars 沒設或 spelling 錯，Astro 不會 fail build，只是把字串 `undefined` 注入。`<script src="...?id=undefined">` Google 會 200 但不 collect 任何 event。Lighthouse 抓不到，DevTools 看 Network filter `gtag` 仍會看到 request（因此 4.4 的驗證會誤判通過）。
>
> **影響**：上線後完全沒有 GA 數據，但本人測試「看到 gtag request」會以為成功。可能要等到一週後查 GA4 報表才發現空的。
>
> **修法**：在 `astro.config.mjs` 旁邊加一個 build-time guard，例如 `site/scripts/check-env.mjs` 在 `prebuild` script 跑：若 `PUBLIC_GA_ID` 不符合 `/^G-[A-Z0-9]+$/` pattern 就 `process.exit(1)`。或在 4.4 改成「Realtime 報表確認看到自己」（網路 request 200 ≠ event 被收）。
>
> **Severity**: HIGH

### Phase 5：DNS 切換 + 自訂網域

**順序很重要 — merge 必須在 add custom domain 之前完成**，否則 production deployment 還是舊 base 配置，custom domain 綁過去會壞站。

- [ ] 5.1 **Gandi DNS** 加 CNAME：`claude-pulse.chatbot.tw` → `claude-pulse-xxxx.pages.dev`（TTL 設 5 min 方便回滾）
- [ ] 5.2 **Gandi DNS** 加 GSC TXT 驗證 record（位置看 GSC 給的指示，多半是 `chatbot.tw` root 或 `_google.claude-pulse.chatbot.tw`）
- [ ] 5.3 **先 merge `migrate/cloudflare-pages` 到 `main`** → CF Pages 自動 rebuild production，等 deploy log 顯示 success
- [ ] 5.4 此時 `xxxx.pages.dev` 應該已是新 base（無 `/claude-pulse/` 前綴），用 `curl -I https://claude-pulse-xxxx.pages.dev` 驗證根目錄 200
- [ ] 5.5 CF Pages → Project → Custom domains → Add `claude-pulse.chatbot.tw`
- [ ] 5.6 等 SSL active（~2-5 min）
- [ ] 5.7 `curl -I https://claude-pulse.chatbot.tw` 確認 200 + 正確 Content-Type；瀏覽器訪問 5 locale 全通
- [ ] 5.8 GSC 完成 DNS 驗證 → 提交 sitemap：`https://claude-pulse.chatbot.tw/sitemap-index.xml`
- [ ] 5.9 GA4 Realtime 自己訪問驗證

> **[審查 2026-05-05]** 技術架構師：5.3 把 custom domain 綁到 CF Pages 後、5.6 merge 之前，custom domain 服務的是 production deployment，但 production = main branch = **舊 config**（`base: "/claude-pulse"`）。
>
> **反證**：Phase 2.2「Production branch: main」+ Phase 3 的 config 改動只在 `migrate/cloudflare-pages` branch。CF Pages 的 production deployment 永遠跟 production branch 走，custom domain 預設指向 production。從 5.3 到 5.6 之間，瀏覽器訪問 `claude-pulse.chatbot.tw` 會拿到 build with `base: /claude-pulse`，所有資源在 `/claude-pulse/_astro/...` 路徑下，根目錄返回 404。
>
> **影響**：5.5 的 `curl -I` 可能拿到 404 或被 Astro 的 base redirect 到 `claude-pulse.chatbot.tw/claude-pulse/`（雙倍前綴），SSL provisioning 時間 + 驗證時間視窗內，新網域對外是壞站。若使用者沒抓到、就此進 Phase 6 改 GitHub Pages，舊新都是壞的，回滾複雜。
>
> **修法**：把 5.6 的 merge **移到 5.3 之前**——順序改為：5.1 CNAME → 5.2 TXT → **5.6 merge to main** → 等 production rebuild 完成 → **5.3 add custom domain** → 5.4 SSL → 5.5 curl 驗證 → 5.7 → 5.8。或者把 5.3 改為「先 add custom domain 但設指向 preview branch `migrate/cloudflare-pages`」（CF Pages 支援 branch alias），驗證完再 swap。
>
> **Severity**: CRITICAL

### Phase 6：舊 GitHub Pages 收尾

- [ ] 6.1 GitHub Pages 切到「redirect-only」模式（建一個極簡 redirect repo 結構）：
  - `index.html` + `404.html`（涵蓋未命中 path）：meta refresh 0s + `<link rel="canonical">` + JS fallback 指向新網域對應路徑
  - **每個 locale** 各放一個 redirect 頁（`zh-TW/index.html`、`zh-CN/index.html`、`ja/index.html`、`ko/index.html`）
  - **`feed.xml` 不能用 HTML 處理**，需改寫成 valid RSS：保留檔案，內含**單一** item「📢 Claude Pulse 已搬家至 https://claude-pulse.chatbot.tw/feed.xml，請更新您的 RSS 訂閱來源」+ `<link>` 指向新 feed URL；GUID 沿用既有 feed 的方案（避免訂閱者看到重複歷史）；**保留至少 90 天**
  - GitHub Action 改寫為部署這份精簡 redirect site，stop deploying full Astro build to GH Pages
- [ ] 6.2 GSC 對舊 property `clementtang.github.io/claude-pulse/` 提交 **Change of Address** → 新 property
  - **預期降級**：GSC 規格要求 server-side HTTP 301，GH Pages 只能做 client-side meta refresh，**Change of Address 可能被 GSC 拒絕**（顯示 "We couldn't verify the redirects"）
  - 拒絕時的 fallback：靠 canonical link + 新 sitemap + Google 自然發現（速度較慢但可行）
- [ ] 6.3 **90 天後**（從 30 天放寬，因 meta refresh 比 301 慢）檢查 GSC：新 domain 索引成長、舊 domain impressions 歸零、舊 RSS feed 流量降至零 → 完全關閉舊 GitHub Pages 部署

> **[審查 2026-05-05]** 技術架構師：Phase 6.3 GSC Change of Address 工具規格上要求 **HTTP 301**；GitHub Pages 不支援 server-side 301，meta refresh 是 client-side、不會被 Change of Address 接受。
>
> **反證**：Google Search Console 官方文件 "Use the Change of Address tool" 明列前置條件 "Set up 301 (permanent) redirects from old URLs to new URLs"。GitHub Pages 只能 serve 靜態檔，無 .htaccess / nginx config，純靜態站只能用 `<meta http-equiv="refresh">` 或 JS 跳轉，兩者皆非 301。Phase 6.1/6.2 的方案都是 meta refresh。
>
> **影響**：Change of Address 提交可能直接被 GSC 拒絕（顯示 "We couldn't verify the redirects"）。即使提交通過，PageRank 與索引轉移效率明顯低於真 301。配合「Phase 6.4：30 天後流量歸零」的時程假設會延後 1-3 個月。
>
> **修法**：兩個選項：(a) 把 `clementtang.github.io` 的 `/claude-pulse/*` 流量先用 Cloudflare Worker proxy 轉成 301（需要 `clementtang.github.io` 進 CF zone，但 github.io 不能加 zone，所以需用 `claude-pulse-redirect.chatbot.tw` 之類做中介，再從 GH 用 meta refresh 跳到該中介，鏈過長放棄）；(b) 接受 meta refresh 是次佳解，把 6.3 改寫為「提交 Change of Address，若 GSC 拒絕則靠 canonical link + sitemap + 30 天觀察期讓 Google 自然發現」，並把 6.4 時程從 30 天放寬到 90 天。
>
> **Severity**: HIGH

> **[審查 2026-05-05]** 技術架構師：6.1 / 6.2 的 redirect 涵蓋只列 root + 5 locale，漏掉 `/claude-pulse/feed.xml`。
>
> **反證**：現有 RSS feed 公開於 `clementtang.github.io/claude-pulse/feed.xml`，X / Threads / 任何發過的搬家公告 link 出去後都會被訂閱者 cache 在 RSS reader 內。Phase 6.2 的 「single redirect HTML」與 6.1 的 「5 個 locale meta-refresh」都不會處理 `.xml` 路徑。
>
> **影響**：所有早期 RSS 訂閱者持續抓 `clementtang.github.io/claude-pulse/feed.xml`，Phase 6.4 關閉 GH Pages 後該 URL 直接 404，訂閱者完全失聯且不會自動發現新 feed。
>
> **修法**：在 GH Pages 收尾前，把 `feed.xml` 改寫為 RSS spec 的 `<newLocation>` 或 HTTP-level redirect 不可，所以最低限度做：(a) 保留 `feed.xml` 為靜態檔，content 改為含一條 item 標題「RSS feed 已搬家至 https://claude-pulse.chatbot.tw/feed.xml，請更新訂閱」+ `<link>` 指向新 URL；(b) 在 site/feed.xml.js 沿用相同 GUID，新舊 feed item 的 GUID 一致，避免訂閱者看到重複歷史。
>
> **Severity**: HIGH

### Phase 7：周邊配套

- [ ] 7.1 README 更新主 URL（已在 Phase 0 結構重整）
- [ ] 7.2 Memory `project_status.md` 更新部署架構描述
- [ ] 7.3 Memory `architecture.md` 更新（GitHub Pages → CF Pages 段落）
- [ ] 7.4 Memory `MEMORY.md` 加一條 reference：「Deployment: CF Pages + claude-pulse.chatbot.tw + GA4」
- [ ] 7.5 Cloud routine（trig_011gxiDNLWLHuHGPjZBFh1Lm）prompt 用 `RemoteTrigger` 更新，確認無寫死舊 URL
- [ ] 7.6 LaunchAgent watchdog：不影響（不依賴外部 URL）
- [ ] 7.7 公開通知 RSS 訂閱者新 URL — 透過寫一篇「搬家公告」式的 log entry，或在 README 強調
- [ ] 7.8 加入 security headers — 在 `site/public/_headers` 建立檔案：
  ```
  /*
    Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
    X-Content-Type-Options: nosniff
    X-Frame-Options: DENY
    Referrer-Policy: strict-origin-when-cross-origin
    Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; img-src 'self' data: https://www.google-analytics.com; connect-src 'self' https://www.google-analytics.com https://*.analytics.google.com; style-src 'self' 'unsafe-inline'
  ```
  CF Pages 會自動讀並套用。Lighthouse SEO/Best Practices 分數會因此提高。

### Phase 8：完工驗證 checklist

- [ ] 8.1 5 locale 路徑（`/`、`/zh-TW/`、`/zh-CN/`、`/ja/`、`/ko/`）皆 200
- [ ] 8.2 `feed.xml` 正常產出，內含 URL 已是新網域
- [ ] 8.3 `sitemap-index.xml` + `sitemap-0.xml` 正確
- [ ] 8.4 GA4 Realtime 看到自己訪問（試 5 個 locale 都送 event）— **不只是 Network filter `gtag` 200，必須在 GA4 Realtime 報表確認**
- [ ] 8.5 GSC 驗證通過 + sitemap 已收
- [ ] 8.6 舊 URL `clementtang.github.io/claude-pulse/{path}` redirect 工作
- [ ] 8.7 舊 RSS feed `clementtang.github.io/claude-pulse/feed.xml` 仍 200 且內含搬家通知 item
- [ ] 8.8 HTTPS 憑證 valid（CF auto-provision Let's Encrypt）
- [ ] 8.9 從 X / LinkedIn 點外連測試（瀏覽器無 mixed content 警告）
- [ ] 8.10 Cloudflare Analytics 看到流量
- [ ] 8.11 Lighthouse SEO 分數 ≥ 90 + 確認 security headers 套用（Response headers 看到 HSTS / CSP）

## 4. 風險 & 回滾

| 風險                                                               | 機率 | 影響 | 緩解 / 回滾                                                                                               |
| ------------------------------------------------------------------ | ---- | ---- | --------------------------------------------------------------------------------------------------------- |
| Astro `base` 移除後內部連結壞                                      | 中   | 高   | Phase 3 嚴格本機 + preview 雙重驗證才動 DNS                                                               |
| ~~Phase 1.3 chatbot.tw NS 切到 Cloudflare~~                        | —    | —    | **採 Option B 後此風險消失**（DNS 留 Gandi）                                                              |
| ~~Phase 1.3 NS 切換漏 MX/SPF/DKIM/CAA records~~                    | —    | —    | **採 Option B 後此風險消失**                                                                              |
| Phase 5 順序錯誤 → custom domain 綁完 main 還是舊 base，新網域 404 | 中   | 高   | **新版 Phase 5 已重排：merge → 等 rebuild → 才 add custom domain**                                        |
| Gandi DNS propagation 慢於預期                                     | 低   | 低   | CNAME TTL 設 5 min；新網域訪問若仍指 GH Pages 等 propagation                                              |
| GH Pages SEO 流量斷層                                              | 中   | 中   | meta refresh + canonical + sitemap，預期 30-90 天 transition（Change of Address 可能被拒，已備 fallback） |
| GA4 measurement ID 寫錯 / 未啟用                                   | 低   | 低   | Phase 4 在 .pages.dev preview 先驗證 Realtime                                                             |
| CF Pages build 失敗                                                | 低   | 中   | 保留 GitHub Pages 部署直到 CF Pages 連續 7 天無事故才停                                                   |
| ~~Cloudflare zone 設定誤觸發 chatbot.tw FB redirect 壞~~           | —    | —    | **採 Option B 後此風險消失**                                                                              |

## 5. 預估時程

| 階段                                   | 動手時間      | 等待時間（DNS / SSL / SEO）                                 |
| -------------------------------------- | ------------- | ----------------------------------------------------------- |
| Phase 1（CF 註冊）                     | 5 min         | —                                                           |
| Phase 2                                | 30 min        | —                                                           |
| Phase 3                                | 60 min        | —                                                           |
| Phase 4                                | 30 min        | —                                                           |
| Phase 5（Gandi CNAME + custom domain） | 20 min        | 5-30 min DNS propagation + 2-5 min SSL                      |
| Phase 6                                | 30 min        | 30-90 天 SEO transition（meta refresh，無 server-side 301） |
| Phase 7                                | 30 min        | —                                                           |
| Phase 8                                | 30 min        | —                                                           |
| **總純動手**                           | **~3.5 小時** | —                                                           |
| **總含等待**                           | —             | **2-4 週完整生效**（DNS 部分快很多，SEO 不變）              |

## 6. 建議分批執行排程

| Session        | 內容                                                    | 何時                   |
| -------------- | ------------------------------------------------------- | ---------------------- |
| S1（核心遷移） | Phase 1（CF 註冊）+ 2 + 3 + 4 + 5（Gandi CNAME + 上線） | 連續半天，避開週一週會 |
| S2（收尾）     | Phase 6 + 7 + 8                                         | 切換後 1-3 天內        |
| S3（觀察）     | 確認 SEO transition、流量數據                           | 切換後 30 天 / 90 天   |

## 7. Decision log（執行時填）

| 日期       | 決策                                              | 結果                                                                                                                    |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-05-05 | 域名選 `chatbot.tw`（vs `clementtang.net`）       | 主題契合度高、未來可擴 ai-pulse / openai-pulse                                                                          |
| 2026-05-05 | Hosting 選 Cloudflare Pages（vs 留 GitHub Pages） | 河內 / 全球 CDN 速度、無頻寬上限、PR preview                                                                            |
| 2026-05-05 | GA4 新 property（vs 共用）                        | claude-pulse 與 FB 社團內容性質差太多                                                                                   |
| 2026-05-05 | ~~DNS 託管 Gandi → Cloudflare~~                   | ~~CF Pages 整合 + DNS 操作介面更直觀~~（**已於 2026-05-06 反轉，見下行**）                                              |
| 2026-05-05 | GA4 + GSC 由使用者手動先建好                      | Measurement ID `G-R69N8EZQE7`、Stream `14810473085`；GSC property 含 Thufir service account 授權                        |
| 2026-05-06 | **DNS 留 Gandi，不搬整 zone（Option B）**         | Claude Pulse 是靜態站不需 CF zone-level 功能；chatbot.tw 既有 4 active subdomain 風險不對等；Phase 1 從半天簡化為 5 min |

---

**核准執行請回覆「同意執行」或指出需要修改的步驟。**

---

## 審查摘要（2026-05-05）

Profile：tech（含 PM / 技術架構師 / 程式設計師 三角度輪替）。本次以 grounding 過 codebase 為基礎，所有反證皆有 file:line。

### 最高風險 TOP 3

| #   | 項目                                                                  | Severity | 一句話說明                                                                                                       |
| --- | --------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Sitemap 根本不存在（Phase 3.3 / 5.7 / 8.3）                           | CRITICAL | `package.json` 沒裝 `@astrojs/sitemap`、無 `sitemap.xml.js`、`dist/` 無 sitemap 檔案；GSC 提交與完工驗證會失敗。 |
| 2   | Custom domain 在 Phase 5.3 ↔ 5.6 之間服務舊 base config（壞站窗口）   | CRITICAL | Production = main = 還是 `base: /claude-pulse`；綁完 custom domain 到 merge 完成前，新網域對外是 404。           |
| 3   | Node version 三處不一致（package.json `>=22.12.0` vs CF Pages 設 20） | HIGH     | npm strict 或未來 Node 22-only 特性會讓 CF Pages build silent 失敗或上線壞站；GH Actions 用 22 與計畫不一致。    |

### 其他高風險（HIGH，順序執行前必處理）

- **Phase 3.2 grep pattern 漏抓 `feed.xml.js:16`** — `/claude-pulse` 對 `claude-pulse/`（slash 位置反向）無命中，RSS link 全部變雙倍前綴 404。
- **Phase 6.3 GSC Change of Address 要 HTTP 301，GH Pages 不能 serve 301** — meta refresh 會被 GSC 拒絕，SEO transition 拉長到 1-3 個月。
- **Phase 6.1/6.2 redirect 漏 `/claude-pulse/feed.xml`** — RSS 訂閱者 30 天後完全失聯。
- **Phase 1.3 沒列 MX/SPF/DKIM/CAA records 的搬遷檢查** — 若 chatbot.tw 有 email forwarding，NS 切換後信件靜默退回。
- **Phase 4.2 GA snippet `PUBLIC_GA_ID` 未設時靜默 ship `id=undefined`** — Network 200 但 0 event collect，本人測試會誤判通過。

### 建議刪除或簡化

| 項目                                                                                                          | 建議                                                                 | 節省資源                                  |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Phase 4.2 同時用 `import.meta.env.PUBLIC_GA_ID` 在 src URL 與 `define:vars` 兩處                              | 合併為一處：直接 hardcode `G-R69N8EZQE7` 為常數，需要換時 PR 改 1 行 | 環境變數隱式相依的失敗模式被消除（見 #5） |
| Phase 6 雙方案並列（6.1 「新 GH Action 部署 redirect HTML」與 6.2 「停用 GH Pages 改 single redirect HTML」） | 二擇一，建議選 6.2（更簡單，Action 可整個刪掉）                      | 維護成本                                  |

### 建議調整的執行順序

1. **新增 Phase 3.7：安裝並設定 `@astrojs/sitemap`，本機 build 驗證 `dist/sitemap-index.xml` 產生** — 否則 Phase 5.7 / 8.3 必失敗
2. **Phase 5 重排** — 改為：5.1 CNAME → 5.2 TXT → **5.6 merge to main 並等 production rebuild** → 5.3 add custom domain → 5.4 SSL → 5.5 curl → 5.7 sitemap → 5.8 GA4
3. **Phase 1.3 之前加 DNS audit step** — `dig chatbot.tw ANY / MX / TXT / CAA` 截圖留檔，Cloudflare 匯入後 dig 一次新 NS 比對
4. **Phase 2.2 Node 版本統一改 22**（與 GH Actions、`engines.node` 對齊）
5. **Phase 4.2 GA snippet 加 build-time guard**（或直接 hardcode `G-R69N8EZQE7`，env 抽象暫時不需要）
6. **Phase 3.2 grep pattern 改為 `grep -rn "claude-pulse" site/src`** 並明示 `feed.xml.js:16` 為已知必改檔案
7. **Phase 6.3 預期降級** — Change of Address 可能被拒，把 6.4 觀察期從 30 天延到 90 天，並加上 canonical link tag 為 fallback

### 未列入但建議補充的項目

- **Phase 4.4 驗證標準** 「DevTools 看到 gtag request」改為「GA4 Realtime 報表看到自己」——只看網路 request 會被 `?id=undefined` 案例騙過。
- **Phase 7 缺一項**：CF Pages env vars 設定（PUBLIC_GA_ID）需在 push 之前完成，否則 Push 觸發的 build 抓不到變數，要再手動 trigger 一次 deploy。
- 計畫沒提 **HSTS / security headers**（CSP、X-Frame-Options 等）。CF Pages 預設不發，可在 `_headers` 檔加。Lighthouse SEO 90 分目標可能受此影響。

### 總評

主結構合理、風險表也有 cover 多數情境，但 grounding 不夠細：sitemap、Node 版本、layout 檔名、grep pattern 漏抓 RSS 等都是 read 過 codebase 一次就能避免的疏失。**強烈建議在動 DNS（Phase 1.3）之前先把 Phase 3 的 sitemap 補上、grep 重跑、本機 build 驗證 `dist/` 結構**，否則切完 NS 才發現問題會有 24 小時等待回滾的 stress。

---

## 對審查意見的回應（2026-05-05，計畫作者）

所有 reviewer 的 file:line claim 已 grounding 驗證：feed.xml.js:16 確實 `claude-pulse/`、`engines.node: >=22.12.0`、layout 是 `Base.astro`、無 `@astrojs/sitemap`，全部屬實。

| Reviewer 發現                                             | Severity | 處置               | 已修改處                                                                                                                                                |
| --------------------------------------------------------- | -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sitemap 不存在 → Phase 5.7 / 8.3 必失敗                   | CRITICAL | **採納**           | 新增 Phase 3.4「安裝 `@astrojs/sitemap`」並驗 `dist/sitemap-index.xml`；Phase 3.5-3.7 順延                                                              |
| Phase 5.3 ↔ 5.6 壞站窗口（custom domain 綁到舊 base）     | CRITICAL | **採納**           | Phase 5 重排：5.1 CNAME → 5.2 TXT → **5.3 merge & rebuild** → 5.4 .pages.dev 驗 → 5.5 add custom domain → 5.6 SSL → 5.7 curl 驗 → 5.8 sitemap → 5.9 GA4 |
| Node 版本三處不一致                                       | HIGH     | **採納**           | Phase 2.2 改 Node `22`，標註與 `engines.node` / GH Actions 對齊                                                                                         |
| Phase 3.2 grep pattern 漏抓 `feed.xml.js:16`              | HIGH     | **採納**           | 改 `grep -rn "claude-pulse" site/src`（無 leading slash），明示 `feed.xml.js:16` 為已知必改檔案、列出 false positive                                    |
| Phase 6.3 Change of Address 要 HTTP 301，GH Pages 做不到  | HIGH     | **採納**           | Phase 6.2 加註「**預期降級**：可能被 GSC 拒絕」，fallback 為 canonical + sitemap；Phase 6.3 觀察期 30 天 → **90 天**                                    |
| Phase 6.1/6.2 redirect 漏 `feed.xml`                      | HIGH     | **採納**           | Phase 6.1 重寫，明列 `feed.xml` 改為 valid RSS 含「搬家通知」item；保留至少 90 天                                                                       |
| Phase 1.3 DNS audit 缺 MX/SPF/DKIM/CAA                    | HIGH     | **採納**           | 新增 Phase 1.3.0：`dig MX/TXT/CAA` 截圖，切換後再比對                                                                                                   |
| Phase 4.2 GA env var silent ship `id=undefined`           | HIGH     | **採納（更激進）** | 直接 hardcode `G-R69N8EZQE7`，不用 env var；4.4 改為「GA4 Realtime 報表確認」，不只 Network 200                                                         |
| Phase 4.1 Layout.astro → Base.astro                       | LOW      | **採納**           | Phase 4.1 改寫指明 `site/src/layouts/Base.astro`（19-37 行間插入）                                                                                      |
| 警告框「Phase 1.2 完成前」應為「1.3」                     | LOW      | **採納**           | 警告框、風險表內所有 1.2 → 1.3                                                                                                                          |
| Phase 6 雙方案合併                                        | 簡化建議 | **採納**           | 刪掉「新 GH Action 部署 redirect」方案，僅保留「停 Astro full build、改部署精簡 redirect site」                                                         |
| 加 `_headers` 設 HSTS / CSP                               | 補充建議 | **採納**           | 新增 Phase 7.8，附完整 `_headers` 範例（HSTS、CSP allow GA、X-Frame-Options 等）                                                                        |
| Phase 4.4 「DevTools 看到 gtag」改為「Realtime 看到自己」 | 補充建議 | **採納**           | Phase 4.4 + 8.4 都已加註「不只 Network 200，必須 Realtime 確認」                                                                                        |

### 不採納或暫不處理

無。所有 reviewer 提出的點都採納了 — 因為 grounding 紮實、修法可執行、且許多是上線前可避免的 silent failure。

### 採納後的核心改動摘要

1. **Phase 3 多一步 sitemap 安裝**（critical 改動，否則 GSC 完全無法索引）
2. **Phase 5 順序大改**（避免新網域上線即 404）
3. **Phase 4 GA snippet 簡化為 hardcode**（消除 silent failure 風險，env var 抽象暫不需要）
4. **Phase 6 redirect 範圍擴大到 feed.xml**（保護 RSS 訂閱者）
5. **Phase 1.3 增加 DNS audit**（保護 chatbot.tw 既有 email 與其他服務）
6. **Phase 7 增加 security headers**（一次補齊 Lighthouse 90 分前置）

### 計畫修訂後的關鍵警示

reviewer 強調的「**動 DNS 前先完成 Phase 3 的 sitemap + 本機 build 驗證**」是對的，已內建於新版執行順序：

- S1（前置 session）：Phase 1（含 NS 切換 + DNS audit）
- S2（核心遷移）：Phase 2 + 3 + 4，**結束時必須在本機 + .pages.dev preview 雙重驗證**才進 S3
- S3（切換）：Phase 5（merge → custom domain），**這是不可逆 commit point**
- S4（收尾）：Phase 6 + 7 + 8

**不可在 S2 沒完整 pass 的情況下進 S3**。
