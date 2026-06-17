# 優先序決策記錄 — Email / 來源分層 / 能力矩陣（2026-06-17）

**狀態**：決策記錄（devil's advocate review 結論）。尚未實作任何功能。
**背景**：競品分析（`docs/competitive-analysis-2026-06.md`）後挑出三個優先項，
經 `/seer`（business profile）審查。本檔記錄審查結論與調整後的執行順序。
**審查依據**：GA4 + GSC 實測數據（見下），非僅文件論點。

---

## 一句話結論

**這幾個功能本身做得對，但時機錯了——在 acquisition（自然流入）不存在前，先做了 retention / SEO-conversion。**
先解「會排名的首頁 0% CTR / 沒有 discovery engine」這個上游問題，再談 Email 與矩陣。

---

## Grounding 數據（2026-05-20 ~ 06-16，28 天）

### GSC（page 維度）— 全站 0 clicks

| 頁面      | impressions | clicks | 平均排名 |
| --------- | ----------- | ------ | -------- |
| `/ja/`    | **690**     | 0      | 8.36     |
| `/`（en） | 283         | 0      | 5.67     |
| `/ko/`    | 163         | 0      | 7.29     |
| `/zh-TW/` | **7**       | 0      | 7.43     |

- query 維度回空（查詢被 GSC 匿名化）。
- 排名在 page 1 的 pos 5–8 卻 **0% CTR**——問題不是「內頁沒排名」，是「會排名的頁面沒人點」。

### GA4 流量來源（active users ≈ 70）

- `(direct)` 33 + Facebook 全家（facebook/m./l./lm.）16 ≈ **70% 是作者自身社群圈**。
- `cn.bing.com` 13 是唯一在帶量的第三方 discovery。
- Google organic ≈ 0；其他搜尋引擎各 1。

**推論**：目前沒有「非作者社群」的 discovery engine。多語系帶來的曝光集中在 `ja/`，
但 0 轉換；source locale `zh-TW/` 幾乎沒有搜尋能見度（7 impressions）。

---

## 各文件審查結論（severity）

### 競品分析（competitive-analysis-2026-06.md）

| Severity | 角色       | 疑慮                                                                                                                     |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| CRITICAL | 競品分析師 | 「真空帶 / blue ocean」把**供給缺口當需求**。全篇測 supply（誰做什麼），零處測 demand。GSC 0 clicks 支持「沒人要」一解。 |
| HIGH     | CMO        | 「5 語系護城河」與自身 GSC 打架：多語系帶來 `ja/` 690 曝光但 0 轉換，`zh-TW/` 僅 7。是假說護城河，非已驗證。             |
| MEDIUM   | 競品分析師 | AINews（150K）同架構但受眾差 2000 倍——是 TAM 上限警訊，不是「架構可參考」的佐證。窄垂直 + 多語系可能在縮小 TAM。         |

### Email 訂閱（email-subscription-feasibility.md）

技術選型本身無異議（正確選 SaaS/Buttondown 而非自建 Workers，KISS、隱私處理到位）。問題在時機與受眾。

| Severity | 角色  | 疑慮                                                                                                                                              |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | CMO   | 在沒有 acquisition 時先做 retention 工具。70% 流量是作者社群圈，Email 只是把已能觸及的人換個管道，增量≈邊際。                                     |
| HIGH     | COO   | zh-TW-only MVP 對準曝光最低 locale。feed 只有繁中，但搜尋能見的是 ja(690)/en(283)；最可能訂閱者收到看不懂的語言 → 退訂/spam → 傷 deliverability。 |
| MEDIUM   | CFO   | 「3–5h MVP」沒綁受眾。多 locale 正解（Phase 2 +0.5–1day）其實是「做對」的前提而非 optional。有效版 1.5–2 天。                                     |
| LOW      | Legal | 跨境個資（越南營運 / 台灣 PDPA / 訂閱者可能含 EU·日·韓）缺正式隱私政策頁與 data controller 宣告。0 成本可補。                                     |

### 能力矩陣 + deprecation 頁（capability-matrix-feasibility.md）

三案中最誠實的一份（自承維護 > build、拒絕自動化寫高風險欄、援引 2026-04-25 幻覺 memory），
且**唯一有 discovery 理論**：賭高意圖長尾查詢比現有導航型 impressions 更會被點。但賭未證、估計與維護負債被低估。

| Severity | 角色       | 疑慮                                                                                                                                                          |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HIGH     | 競品分析師 | 診斷錯上游：真問題是首頁 0% CTR，不是缺內頁。再加 pos 5–8 的頁面，沒證據 CTR 會 >0。                                                                          |
| HIGH     | CFO        | 「2.5–3 天」「data spike 0.5 天」嚴重低估首次 sourcing + recurring 維護。對整個 Claude 家族逐欄查證 + URL 200 驗證，0.5 天大概率變 1–2 天，且每季 recurring。 |
| MEDIUM   | COO        | 缺 kill criteria，用「this is a bet, accept it」迴避量化。recurring 負債沒有失敗門檻就永不會被砍。                                                            |
| MEDIUM   | CMO        | pricing 欄是變動最頻、信任反噬最大的欄（doc §7 自承），卻預設納入。過期定價比沒有定價更傷權威頁。                                                             |

---

## 調整後的執行順序（取代競品分析 §建議優先序）

原順序 `Email > 來源分層標記 > 矩陣` 從成長角度**大致反了**：
Email 是 retention（需先有 acquisition），矩陣是三案唯一的 discovery 賭注。

1. **先診斷 0% CTR（1–2h，不寫 code，最上游最便宜）**
   - 查各 locale 首頁在 SERP 的 title/meta 賣相、1161 impressions 是真需求或品牌導航雜訊（搜「claude」者本要去 anthropic.com）。
   - **這一步不做，下面全是猜。** 結果只兩種：impressions 是雜訊 → discovery 另尋管道；或 SERP 賣相問題 → 改 title/meta 即可能解，比任何新功能便宜。

2. **放大既有社群（FB / Threads / X）**
   - 目前唯一在帶非作者流量的管道之一，零建設成本、立即 acquisition。優先於 Email。

3. **來源分層標記（可順手做）**
   - 資料已有、最便宜、低風險、提升品質。但別期待帶流量——不解 discovery 也不解 0-CTR。

4. **矩陣 — 有紀律的 discovery 實驗（非現在）**
   - 投 2.5–3 天前先廉價驗證「高意圖長尾查詢真有量」。
   - MVP 砍掉 pricing 欄。
   - 設 **90 天 kill gate**：launch 後仍 0 click 就凍結維護 / 下架。

5. **Email — 最後做**
   - 等步驟 1–2 證明有「非作者社群」自然流入、有東西可留存再補。
   - 做時用 `en` 或多 locale，**別預設 zh-TW**。

---

## 前置條件（不滿足前不動 Email / 矩陣）

- [ ] 0% CTR 真因已釐清（impressions 是真需求還是雜訊 / SERP 賣相問題）
- [ ] 確認有「非作者自身社群」的自然流入

在這兩者滿足前，Email 帶不來實質訂閱、矩陣帶不來實質點擊，屬「做了也沒用」的工時。

---

## 建議刪除或簡化

| 項目                   | 建議                                    | 節省                             |
| ---------------------- | --------------------------------------- | -------------------------------- |
| Email 全 5 locale 表單 | MVP 砍到單一 locale（en 或 zh-TW）      | 0.5–1 day + 退訂/spam 風險       |
| Matrix pricing 欄      | MVP 不做，連官方定價頁                  | 最高頻 recurring 維護 + 信任反噬 |
| 競品分析「真空帶」結論 | 降級為「unvalidated bet」，加需求證據欄 | 避免以假需求排優先序             |

---

_審查方法：`/seer` business profile（CFO / CMO / 競品分析師 / COO / Legal），steel-man → 倖存疑慮 → severity。
數據來源：Thufir MCP（GA4 ga4_report、GSC gsc_analytics）。_
