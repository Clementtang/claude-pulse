# Claude Pulse 競品分析（2026-06）

> 研究方法：2026-06-17 以 4 個平行 agent 分領域 web research（Anthropic 專屬追蹤站／廣義 AI 新聞聚合／模型時間軸與狀態儀表板／本地語言與 AI 自動策展）。所有服務經 WebSearch + WebFetch 驗證存在；無法驗證者標 [UNVERIFIED]。

## 一句話結論

「**Anthropic 專項 × 多語系（5 locale）× 可搜尋時序存檔 × 透明 AI 自動化**」這個組合，市面上沒有第二家在做。Claude Pulse 踩在一個真空帶；競品要嘛泛 AI 通論、要嘛英文單語、要嘛純人工或純黑箱。

---

## 競品地圖

### A. Claude / Anthropic 專屬追蹤站（最直接同類）

| 服務              | URL                                           | 重點功能                                                                                         |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Releasebot        | releasebot.io/updates/anthropic               | 多管道通知最齊（RSS+Email+CLI+Slack+MCP+n8n），按產品切頁；自動抓取+人工稽核                     |
| claudeupdates.dev | claudeupdates.dev                             | **Silent edits 追蹤**（官方 CHANGELOG 沒標版本卻偷改的條目）+ 版本 compare + RSS                 |
| cc.bruniaux.com   | cc.bruniaux.com/releases/                     | GitHub Releases 自動同步，⚠️ **breaking-change 標旗**、⭐新功能、🔒安全；RSS + ⌘K 搜尋；CC BY-SA |
| claudefa.st       | claudefa.st/blog/guide/changelog              | 人工敘述式改寫全版本，⌘K 搜尋；無 RSS                                                            |
| hidekazu-konishi  | hidekazu-konishi.com                          | 手工**能力演進矩陣**（哪個模型首次支援哪功能）+ 多平台可用性矩陣 + **deprecation 時間軸**        |
| changelogger.live | changelogger.live                             | 50+ AI 工具聚合，RSS + **Email breaking-change alerts** + 個人化 dashboard；贊助制               |
| havoptic          | havoptic.com/tools/claude-code                | AI 自動摘要 + 跨工具比較                                                                         |
| scriptbyai        | scriptbyai.com/anthropic-claude-timeline/     | 人工模型時間軸 + Substack newsletter                                                             |
| ClickUp           | clickup.com/learn/topic/ai/tools/claude/news/ | 含「為什麼重要／實際影響」**商業解讀**層                                                         |

### B. 廣義 AI 新聞 / 電子報

| 服務                   | 規模  | 重點                                                                                                                                                  |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AINews (smol.ai)**   | 150K+ | ⭐ **架構最像 Claude Pulse**：AI agent 自動策展 + Astro 靜態站 + tag 分類 + RSS + 可搜尋存檔，**開源** `smol-ai/ainews-web-2025`。差別：泛 AI、純英文 |
| There's An AI For That | 2.8M  | 45K 工具目錄 + 每日電子報                                                                                                                             |
| The Rundown AI         | 2M+   | 電子報 + 課程 + 工具目錄 + podcast                                                                                                                    |
| TLDR AI                | 920K  | 極簡電子報，無公開存檔                                                                                                                                |
| The Neuron             | 700K  | RSS 可用 + 存檔                                                                                                                                       |
| Ben's Bites            | 165K  | builder 利基，Substack                                                                                                                                |
| Import AI              | 131K  | Jack Clark（Anthropic 共同創辦人）週報，深度政策視角                                                                                                  |
| Last Week in AI        | 181K  | 週報 + podcast 雙格式                                                                                                                                 |
| Techmeme               | —     | 演算法聚合 + 人工審核，多視角同事件聚合                                                                                                               |

### C. 模型時間軸 / benchmark / 狀態儀表板

| 服務                      | 類型           | 重點                                                                     |
| ------------------------- | -------------- | ------------------------------------------------------------------------ |
| artificialanalysis.ai     | 比較/benchmark | **獨立實測（非廠商自報）** + **定價歷史走勢圖**                          |
| aiflashreport.com         | 時間軸+新聞    | 已有 **RSS** + 可篩選時間軸 + 每筆附授權類型與來源連結                   |
| benchlm.ai                | benchmark      | 「**provisional vs. verified**」信心分層 + 週報 email                    |
| lifearchitect.ai          | 時間軸         | 800+ 模型 Google Sheets，自訂 ALScore 能力評分                           |
| aireleasetracker.com      | 時間軸         | 161 模型，公司 vs 公司走勢比較 + 釋出通知訂閱                            |
| llm-stats.com             | leaderboard    | 定價每小時更新 + 「AI Updates Today」即時 feed                           |
| status.claude.com         | 官方狀態       | Atlassian Statuspage，Email/SMS/Slack/webhook/Atom；**只記事實不做詮釋** |
| IncidentHub / StatusGator | 狀態聚合       | 多 provider，StatusGator 有 **early-warning 早期預警**                   |

### D. 本地語言 / AI 自動策展

| 服務              | 語言         | 重點                                                                                  |
| ----------------- | ------------ | ------------------------------------------------------------------------------------- |
| Ledge.ai          | 日           | Anthropic 日本動態覆蓋高，純人工                                                      |
| AINOW             | 日           | 偏 OpenAI，Anthropic 覆蓋低                                                           |
| aitimes.kr        | 韓           | 韓國 AI 專業媒體，Claude 有報導                                                       |
| 機器之心/Synced   | 中+英        | 雙語架構，研究深度，PRO 訂閱                                                          |
| 36kr              | 中+英+德     | 英文版有**非西方批判視角**（Anthropic 出口管制等）                                    |
| iThome            | 繁中         | 台灣 IT 媒體公信力高，但 Anthropic 覆蓋頻率低、偏企業大故事                           |
| **particle.news** | 英（多語弱） | ⭐ **Reality Check**：第二道 AI pass 逐句比對原文驗證（防幻覺）；多來源≥3篇才成立一則 |
| brevio.news       | 5 語含日文   | 號稱「editorially adapted」非機翻；無繁中/韓文                                        |
| Kagi News         | AI 翻 30 語  | 規模大深度淺，整合進 Kagi 搜尋訂閱                                                    |

---

## Claude Pulse 缺、而對手有的功能（gap）

| 功能                                         | 誰在做                            | 對 Claude Pulse 的價值                           | 優先         |
| -------------------------------------------- | --------------------------------- | ------------------------------------------------ | ------------ |
| **Email / Slack 訂閱**                       | releasebot、changelogger、benchlm | 補通知缺口，目前只有 RSS                         | 高（低成本） |
| **來源分層標記**（T1 官方/T2 媒體/T3 社群）  | benchlm、aiflashreport            | 編輯原則已有 T1-first，只差 UI 顯示              | 高           |
| **能力演進矩陣 + deprecation 時間軸**        | hidekazu-konishi                  | SEO 藍海；解「曝光集中 locale 首頁、內頁沒吃到」 | 中高         |
| **Breaking-change 標旗 / silent-edits 追蹤** | cc.bruniaux、claudeupdates.dev    | 對開發者讀者行動價值高                           | 中           |
| **摘要事實查核（Reality Check）**            | particle.news                     | 直接回應已踩過的幻覺事件                         | 中           |
| **Incident 事後解析 + 跨廠商對照**           | （沒人做 Anthropic 專項）         | status.claude.com 只記事實，這是空缺             | 中           |
| **定價/changelog 視覺化時間軸**              | artificialanalysis（定價）        | 沒人做 Anthropic 專項，可成 unique artifact      | 低           |
| **版本 compare / diff 工具**                 | claudeupdates.dev、aiflashreport  | 開發者實用                                       | 低           |

## Claude Pulse 既有護城河（競品都沒有）

1. **5 語系 × Anthropic 專項** — 真正稀缺；Brevio 有日文無繁中/韓文，Kagi 機翻 30 語但無主題深度，專屬追蹤站全英文單語。
2. **Anthropic-only 垂直深度 + 事件脈絡詮釋** — B/C 類全是「所有 labs 通論」。
3. **透明的 AI 自動化策展** — 多數對手假裝純人工或黑箱；公開誠實是可信訊號。
4. **可搜尋的時序公開存檔** — TLDR、Ben's Bites 等電子報無公開存檔。

## 最值得盯的兩個對標

- **AINews (smol.ai)**：架構雙胞胎（AI agent + Astro 靜態 + tag + RSS + 存檔）且開源，可參考技術細節；用「Anthropic 專項 + 多語系」錯開其「泛 AI 純英文」。
- **particle.news 的 Reality Check**：可移植來補防幻覺機制。

## 建議優先序

1. **Email 訂閱**（補通知缺口、低成本）
2. **來源分層標記**（資料已有 T1/T2 判斷，只差顯示）
3. **能力演進矩陣 / deprecation 頁**（SEO 藍海，解內頁沒吃到曝光的問題）

> 詳細可行性評估與實作規劃見 `docs/plans/`。
