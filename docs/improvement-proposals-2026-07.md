# 功能與使用者需求改善提案（2026-07）

**狀態**：提案文件，未實作。
**定位**：接續 `docs/plans/prioritization-decision-2026-06-17.md`（含 06-20 / 06-25 / 06-26 addendum）的決策脈絡，不重開已否決的方向。該文件的第 0 順位（可索引性程式修復）已於 commit `901f995` 出貨；本文件回答「修復出貨後、Google 仍未收錄的現在，下一步做什麼」。
**數據採集**：2026-07-08，Thufir MCP（`ga4_report` / `gsc_analytics` / `gsc_inspect_url`）+ repo 實地檢查（log、site build 產物、fetcher state）。

---

## 1. 摘要 — Top 3 優先建議

**第一優先：Log 資料驗證（build-time lint）+ 修復既有壞列。** `claude_pulse_log.md` 第 395 列（Claude Code 2.1.133）的 summary 內含未跳脫的 `|`，把 markdown 表格欄位切歪，source 欄位移進 url 欄，五個 locale 頁面上因此渲染出相對連結 `/github.com`。這不是理論風險——GA4 顯示真的有 2 位使用者點進 `/github.com`，而 GSC 近 30 天全站唯一有曝光的頁面就是這個壞頁 `/ja/github.com`（2 次曝光）。在 Google 對本站做「值不值得收錄」品質判定的敏感期，站上掛著爬得到的壞 URL 是負面訊號。curation 每月約 103 次 commit、多數由 auto mode 無人值守寫入，沒有驗證層這類沉默損壞必然重演。成本 S，效益橫跨內容正確性、讀者體驗與 SEO。

**第二優先：Bing / IndexNow 佈局——面向「實際存在」的讀者。** 數據說得很直白：近 30 天 Google 曝光 2 次、點擊 0；而 `cn.bing.com` 是最大外部 referrer（24 sessions），中國桌機使用者 55 人是最大讀者群，看的是 `/zh-CN/`。目標讀者「經搜尋引擎進站的中文讀者」此刻是經 Bing 進站的——而且中國讀者本來就用不了 Google，Google SEO 對這群人永遠無效。Bing 已自然收錄本站，但從未經營：Bing Webmaster Tools 未驗證、sitemap 未提交、無 IndexNow。用 S 級成本強化唯一活著的 acquisition 管道，效益／成本比全案最高之一。

**第三優先：月度 archive 頁 + per-item permalink + 結構化資料（回應 Google 薄內容判定）。** 首頁與 `/ja/` 在 6/26 重爬過修復版後仍是 `Crawled – currently not indexed`，至 7/8 再無重爬、曝光持續為 0——06-26 addendum 設定的「再觀察一週」已過，該正視假說 #2（薄內容／價值訊號不足）。目前全站每個 locale 只有一張 87 萬～100 萬 bytes 的單頁塞 604 筆條目，無任何 per-item URL、無結構化資料，對 Google 而言是「一個很大的薄頁」。拆出月度 archive 頁（每月 120–200 筆）＋條目錨點＋ ItemList/NewsArticle 結構化資料，是對索引問題僅存的可行槓桿，同時解決分享連結與頁面肥大問題。成本 M，比照能力矩陣決策設 90 天 kill gate。

---

## 2. 現況盤點

### 2.1 功能清單

| 面向     | 現況                                                                                                                                                          |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 網站     | Astro 6 靜態站，Cloudflare Pages，`claude-pulse.chatbot.tw`；5 locale（en / zh-TW / zh-CN / ja / ko）各一張單頁                                               |
| 內容     | `claude_pulse_log.md` 為權威資料源，604 筆（2026-02 至 07），月量 120–200 筆；zh-TW 原文 + 4 locale 翻譯 JSON                                                 |
| 瀏覽     | 分類篩選（5 類）+ 時間範圍（7 / 30 / 全部）；無關鍵字搜尋、無分頁、無 per-item 連結                                                                           |
| 訂閱     | RSS 單一 feed（zh-TW），全量 570 筆 / 592 KB                                                                                                                  |
| 站上加值 | status.claude.com 即時狀態燈、瀏覽器語言自動導向（已加 crawler guard）                                                                                        |
| SEO      | canonical + hreflang + 關鍵字化 title 已上線（`901f995`）；sitemap 僅含 5 個 locale 首頁；無結構化資料                                                        |
| 自動化   | fetcher（3 collectors，每 4h）、incident watcher、watchdog、cloud routine（每日 07:00）、`/pulse-curate` skill（interactive / auto 雙模式，LaunchAgent 排程） |
| 觀測性   | watchdog 監控 fetcher freshness；auto mode 寫 stdout log + macOS 通知；`coverage.py` 存在但 `data/coverage_report.md` 停在 2026-04-16                         |

### 2.2 使用數據（2026-06-08 ～ 07-07，30 天）

**GA4：**

| 指標         | 數值                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| 總 pageviews | 約 197（`/` 92、`/zh-TW/` 65、`/zh-CN/` 35、`/ja/` 2、`/ko/` 1、`/github.com` 2）                              |
| 流量來源     | direct 70、`cn.bing.com` referral 24、FB 全家 21、`clementtang.github.io` 17、bing organic 4、Google organic 0 |
| 國家別       | 中國（桌機）55、台灣 20、美國 15，其餘零星                                                                     |

解讀：direct + FB ≈ 作者自身社群圈（與 06-17 決策文件觀察一致）；**唯一在成長的第三方管道是 Bing，服務的是 zh-CN 讀者**。ja / ko 兩個 locale 合計 3 位使用者。

**GSC（`sc-domain:claude-pulse.chatbot.tw`）：**

- 近 30 天：曝光 2 次（全部在 `/ja/github.com` 壞頁）、點擊 0、query 維度回空。
- 60 天趨勢：5/20–6/05 曾有一波曝光（尖峰 162/天，0 點擊），6/06 起歸零至今。
- URL inspection（2026-07-08 實測）：首頁與 `/ja/` 皆 `Crawled – currently not indexed`，`lastCrawlTime` 都停在 2026-06-26——P0 修復版已被爬過但未被收錄，且 12 天無再爬。`/ja/` 已脫離 `Page with redirect`（crawler guard 修復生效），但同樣停在 not indexed。

**維護面：**

- 近 30 天 112 commits，其中 103 筆 `pulse:` curation commit——高頻、多數無人值守。
- fetcher 健康（`state.json` last_checked 2026-07-07 16:00 UTC）；`pending_log_updates.json` 有 1 筆 7/7 incident 待下次 curate 收尾（機制正常運作）。
- `data/candidates.json` 累積 395 筆 / 400 KB、`state.json` incident_tracking 142 keys，皆只增不減。

---

## 3. 提案清單（依效益／成本比排序）

### P1（Top 3）：Log 資料驗證 + 修復壞列

- **問題**：v2 schema 是手寫 markdown 表格，欄位內未跳脫的 `|` 會沉默切歪整列。實證：log 第 395 列（2.1.133，summary 含 `` `fresh` |`head` ``）導致 url 欄變成裸字串 `github.com`，五個 locale 各渲染一個 `/github.com` 相對連結；GA4 記錄到 2 次真實點擊，GSC 顯示 `/ja/github.com` 是近 30 天全站唯一被 Google 曝光的頁面。`parse-pulse.js` 與 build 皆不報錯。curation 每月 103 commits、auto mode 佔多數，無驗證層下同類損壞會重演且難察覺。
- **建議做法**：
  1. 立即修復第 395 列（`|` 跳脫為 `\|`），同步檢查 4 個 summary JSON 對應 key。
  2. 在 `parse-pulse.js`（或獨立 `site/scripts/validate-log.mjs`，掛進 `npm run build` 前置）加驗證：url 必須 `^https://`、category 在 5 類 enum 內、date/time 格式、欄位數恰為 6、date ≤ 今天。違規即 build fail（CF Pages 部署會擋下壞資料）。
  3. `/pulse-curate` SKILL.md 的 Gotchas 補一條「summary 含 `|` 必須跳脫」。
- **預期效益**：杜絕一整類沉默資料損壞（影響 5 locale + RSS + sitemap）；在索引品質判定敏感期移除壞 URL 負面訊號；auto mode 寫壞資料時 fail fast 而非上線。
- **成本**：S（半天內；驗證器 <100 行）。
- **風險**：驗證太嚴擋住合法條目（如未來新 category）——enum 集中定義、錯誤訊息含列號即可低成本調整。build fail 會讓當次 auto curation 部署卡住，但這正是目的；watchdog／deploy 通知已能察覺。

### P2（Top 3）：Bing Webmaster + IndexNow——經營實際存在的搜尋管道

- **問題**：專案假設的讀者是「經搜尋引擎進站的中文讀者」，數據顯示這群人真實存在但**在 Bing 不在 Google**：`cn.bing.com` 是最大外部 referrer（24 sessions），最大讀者群是中國桌機使用者（55 人，看 `/zh-CN/`），而 Google 30 天曝光 2 次、點擊 0。中國讀者無法使用 Google，Google SEO 對這個核心客群結構性無效。Bing 目前是「自然被收錄」狀態，從未主動經營：未驗證 Bing Webmaster Tools、未提交 sitemap、無 IndexNow 推送。
- **建議做法**：
  1. Bing Webmaster Tools 驗證（支援從 GSC 一鍵匯入，幾分鐘）、提交 `sitemap-index.xml`。
  2. 用 Bing 端數據複驗：zh-CN 讀者搜什麼 query 進站（GSC query 全匿名化，Bing 或許可見）。
  3. 評估 IndexNow：CF Pages deploy hook 或 GitHub Action 在每次 push 後 ping IndexNow API（Bing / 百度系皆收），讓每日更新的時效內容立即被爬。此步為 optional 加分項。
- **預期效益**：強化唯一在帶非作者流量的管道；每日更新的新聞站配 IndexNow 是天然組合（freshness 是本站相對優勢）；順帶覆蓋同樣吃 IndexNow 的其他搜尋引擎。
- **成本**：S（步驟 1–2 純 console 操作 1–2 小時；IndexNow 約半天）。
- **風險**：Bing 流量天花板低於 Google——但這是「現在就有的讀者」對「還不存在的讀者」，天花板論不構成不做的理由。百度不收 IndexNow 以外的境外站是既知限制，不另投入。

### P3（Top 3）：月度 archive 頁 + per-item permalink + 結構化資料

- **問題**：Google 對修復版首頁的判定仍是 `Crawled – currently not indexed`（6/26 重爬、7/8 複驗未變、12 天無再爬、曝光持續 0）。06-26 addendum 的觀察窗已過，根因天平明確倒向假說 #2／#3（薄內容／新網域權威不足）。結構面看確實「薄」：每個 locale 全站只有一頁，87 萬～100 萬 bytes 塞 604 筆、預設篩 7 天但 DOM 全載；無任何 per-item URL（RSS 與社群分享都無處可指）；無結構化資料。條目只會越來越多，單頁架構的頁面肥大與「一大張薄頁」問題只會惡化。
- **建議做法**（維持 Astro，僅加頁面，不動資料源）：
  1. 新增 `/{locale}/archive/YYYY-MM/` 月度頁（Astro `getStaticPaths` 從既有 `parse-pulse.js` 產生），每頁 120–200 筆、附 per-item `id` 錨點（用穩定 key `date|category|source[#N]`，不用全域 index）。
  2. 首頁瘦身為近 30 天條目 + 指向 archive 的月份導覽，頁重從 ~900 KB 降到 ~150 KB 級。
  3. 加 `ItemList` + 條目級 `NewsArticle`（或 `LiveBlogPosting`）JSON-LD；archive 頁自動進 sitemap（@astrojs/sitemap 原生支援）。
  4. 上線後對 archive 頁抽樣送 reindex，觀察 90 天。
- **預期效益**：對「索引卡在品質判定」僅存的可行槓桿——頁面數從 5 → 30+、每頁主題聚焦（單月時間切片）、有機器可讀的內容結構；副效益立即兌現且不依賴 Google：可分享的 permalink（FB 是第二真實管道，目前分享只能貼首頁）、行動端頁重大幅下降（台灣讀者 11/20 是行動端）、RSS 有真實可指的 link。
- **成本**：M（1–2 天：路由 + 錨點 + JSON-LD + 首頁瘦身；資料層零改動）。
- **風險**：Google 可能仍不收（新網域權威不足是無法用站內手段解的）——因此比照能力矩陣決策設 **90 天 kill gate**：archive 頁上線 90 天後若 GSC 曝光仍為 0，停止在此方向加碼（頁面保留，靜態頁無 recurring 維護）。注意 hreflang/canonical 需在 archive 頁複用 `Base.astro` 既有機制（`901f995` 已預留 `path` prop），避免重蹈 locale 重複內容問題。

### P4：RSS 品質修正

- **問題**：RSS 是本站唯一訂閱機制，但目前對訂閱者近乎失能：(a) 全量 570 筆 / 592 KB，違反 feed 慣例、拖慢輪詢；(b) `feed.xml.js:16` 的 link 是 `#{date}-{category}-{全域index}` 假錨點——頁面上沒有這些 id，點了只回首頁頂部；(c) 全域 index 會隨每次新增條目整體位移，@astrojs/rss 預設以 link 為 guid，等於**每天 commit 後所有舊條目的 guid 都變**，訂閱端可能反覆把整包舊聞標成未讀；(d) `pubDate` 硬編 `08:00+07:00`，無視 log 已有的 time 欄（`feed.xml.js:14`）。
- **建議做法**：feed 截到最近 50 筆；link 改指 source URL（P3 上線後改 permalink）；guid 明確設為穩定 key；pubDate 用 `datetimeUtc`。約 10 行改動。
- **預期效益**：RSS 訂閱者（含 RSS 聚合器收錄的可能性）得到正常 feed；頻寬 592 KB → ~50 KB。
- **成本**：S（1–2 小時）。
- **風險**：guid 規則切換會讓既有訂閱端把最近 50 筆重新標未讀**一次**——一次性成本，與 cap 同時做可把影響限制在 50 筆。

### P5：站內關鍵字搜尋（client-side 文字篩選）

- **問題**：604 筆條目只有分類 + 時間範圍兩種篩選。讀者無法回答「Fable 5 相關的條目有哪些」「上次 GitHub 相關 outage 是何時」這類 Pulse 最擅長的問題；維護者自己（主要讀者）目前得 grep markdown。
- **建議做法**：在 filters 列加一個文字輸入框，對已在 DOM 的 `.card-summary` 做即時包含比對（與既有 category/range filter AND 疊加）。不引入搜尋服務或索引庫——資料已全部在頁面裡。P3 上線後首頁只剩 30 天資料，屆時搜尋框可加「在 archive 中繼續找」的導引，或改為 build 時輸出輕量 JSON 索引。
- **預期效益**：把「事件記憶庫」的價值做成可用功能，對兩類使用者都直接受益；也是競品少有的即答能力。
- **成本**：S（半天；~60 行 JS + i18n 字串 ×5）。
- **風險**：600+ 節點的 DOM 篩選效能無虞；中文比對用簡單 `includes` 即可，無需分詞。

### P6：Curation 觀測性——coverage report 排程化

- **問題**：fetcher 有 watchdog，但「curation 是否漏收」沒有任何持續量測：`fetcher/src/coverage.py` 能比對 candidates 與已發布 log，產物 `data/coverage_report.md` 卻停在 2026-04-16（一次性 backfill 審計）。歷史上的失效都是沉默型（LaunchAgent 斷 16 小時、routine 連續 3 天幻覺版號），現有機制只保證「有在跑」，不保證「有收到該收的」。
- **建議做法**：每週跑一次 coverage.py（可掛在既有 watchdog LaunchAgent 或 `/pulse-curate` 週一首跑時順帶），missing 數量異常（如 >5 筆 T1）時走既有 macOS 通知管道。報告本身已實作，只差排程與門檻。
- **預期效益**：涵蓋度從「靠感覺」變成每週有數字；配合 P1 的 build 驗證，curation 管線的兩端（收錄完整性、寫入正確性）都有防線。
- **成本**：S（排程 + 門檻邏輯約半天；coverage.py 需先確認 URL 比對規則仍符合現行 log 格式）。
- **風險**：coverage 的「missing」含編輯判斷下故意不收的項目（寧缺勿濫原則），門檻與白名單要調校，否則通知變 noise。

### P7：ja / ko locale 量測 gate

- **問題**：ja + ko 近 30 天合計 3 位使用者；5 月那波 `/ja/` 690 次曝光 0 點擊後已歸零。但每筆條目仍要付 ×4 翻譯成本（每月 103 次 curation 都含 ja/ko 翻譯），是全專案最大的 recurring 內容成本之一，投在證據最弱的兩個 locale。
- **建議做法**：不是現在砍——是給它和能力矩陣同等的紀律：設量測 gate「P3 上線後 90 天，若 ja + ko 合計 sessions 仍 < 30/月，凍結新條目翻譯（既有頁面與翻譯保留，UI 加『此語言更新已暫停』說明）」。en / zh-CN 不在此列（zh-CN 是最大真實讀者群，en 是 x-default）。
- **預期效益**：若觸發，每次 curation 省 2 個 locale 的翻譯與 JSON 維護，auto mode 出錯面也縮小一半。
- **成本**：S（決策 + 到期量測；凍結時的 UI 說明是小改動）。
- **風險**：「5 語系」是曾主張的差異化——但 06-17 審查已把它降級為未驗證假說，本提案正是給它一個公平的驗證期限，而非直接否定。

### P8：data/ 檔案瘦身

- **問題**：`candidates.json` 累積 395 筆 / 400 KB 只增不減，`/pulse-curate` 每次執行都整檔讀入 LLM context（每週約 39 次自動觸發）；`state.json` 的 incident_tracking 已 142 keys。token 成本與讀取時間隨時間線性增長，也墊高 Agent SDK credit 消耗（memory 中該追蹤項仍 OPEN）。
- **建議做法**：fetcher 寫入時只保留最近 60 天的 candidates（舊資料移到 `candidates-archive.json`，不進 curation 讀取路徑）；incident_tracking 只留未解決 + 最近 30 天。
- **預期效益**：curation 每次執行少讀 ~300 KB；成本曲線從線性成長變平。
- **成本**：S（fetcher 內 ~30 行 + 測試）。
- **風險**：dedup 依賴歷史 URL——但 curation 的去重是對 log 本身 grep URL set，不依賴 candidates 歷史，確認此點後即安全。

---

## 4. 不建議做的事

| 方向                                             | 否決理由                                                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Email 訂閱（方案 C）**                         | 維持 2026-06-17 決策：acquisition 未證前不做 retention。目前非作者流量仍只有 Bing 一條細流，前置條件未滿足。P4 把 RSS 修好是更便宜的訂閱替代。                                                                                                    |
| **能力矩陣資料工程**                             | 維持 2026-06-17 決策：索引恢復前不投 2.5–3 天 + recurring 維護。P3 若讓 archive 頁被收錄，才回頭評估。                                                                                                                                            |
| **對 Google 再送 reindex / 繼續等待**            | 首頁已被積極重爬過修復版仍不收，卡在品質判定而非技術阻擋；重送無效，純等待已證明無果（6/06 起 30+ 天曝光 0）。行動應轉向 P3（改變被判定的內容本身）與 P2（繞開 Google）。                                                                         |
| **立即移除 ja / ko locale**                      | 數據支持懷疑但 P3 會改變頁面結構與索引狀態，砍在實驗前會污染結果。改走 P7 的 90 天 gate。                                                                                                                                                         |
| **引入搜尋服務（Algolia / Pagefind）或全文索引** | 604 筆資料全在單頁 DOM，client-side 篩選（P5）零依賴、零 recurring 成本即可滿足需求。資料量成長 10 倍前不需要。                                                                                                                                   |
| **重寫架構 / 換框架 / 加 CMS、資料庫**           | 明確排除（任務前提）。也無壓倒性理由：markdown log + Astro SSG 的 build 秒級完成、資料源可 grep 可 diff，正是 curation 自動化能穩定運作的原因。                                                                                                   |
| **社群自動發佈（方案 B，X / Threads）**          | 06-17 決策把「放大既有社群」排在前段，但自動發佈的建置（Satori 圖卡 + API 整合）成本 M 而 FB 手動分享的邊際成本近零。P3 的 permalink 是它的前置（沒有可連結的條目頁，社群貼文只能導首頁）。permalink 上線、手動分享驗證有轉換後再回頭評估自動化。 |

---

## 附錄：本次採集的關鍵數據指紋

- GSC 60 天趨勢：5/20 起曝（36→133→162/天）→ 6/04 驟降 → 6/06 起歸零至 7/05（僅 6/11、6/13 各 1 次雜訊）。
- GSC URL inspection（7/8）：`/` 與 `/ja/` 皆 `Crawled – currently not indexed`、`pageFetchState: SUCCESSFUL`、`robotsTxtState: ALLOWED`、lastCrawlTime 2026-06-26。
- GA4 30 天 pagePath：`/` 92、`/zh-TW/` 65、`/zh-CN/` 35、`/github.com` 2、`/ja/` 2、`/ko/` 1（pageviews）。
- 單頁 build 產物：`dist/index.html` 928 KB、`/ja/` 1.0 MB、`/ko/` 972 KB、`/zh-TW/`・`/zh-CN/` 868 KB；`feed.xml` 592 KB / 570 items。
- 壞列：`claude_pulse_log.md:395`（2.1.133，summary 內 `` `fresh` |`head` `` 未跳脫）。
- 月度條目量：2026-03 61、04 124、05 200、06 186、07（至 7 日）32。
