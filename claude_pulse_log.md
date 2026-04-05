---
name: claude-pulse-log
description: Known items log for Claude Pulse — tracks reported updates to avoid duplicates. Structured table with date, category, summary, source.
type: reference
---

# Claude Pulse Log

## Known Items

| date       | category    | summary                                                                                                                                                                               | source                |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 2026-04-04 | claude-code | Claude Code 2.1.92 — `forceRemoteSettingsRefresh` 強制遠端設定刷新、互動式 Bedrock 設定精靈、`/cost` 按模型與快取細分、`/release-notes` 版本選擇器、Remote Control 以主機名為前綴、Write diff 提速 60%、移除 `/tag` `/vim` | github.com            |
| 2026-04-04 | industry    | Anthropic 封鎖 Claude Pro/Max 訂閱用於 OpenClaw 等第三方 AI agent 框架（4/4 生效），改採用量計費，數千用戶費用最高暴漲 50 倍，OpenClaw 創辦人批評此舉背刺開源開發者                    | venturebeat.com       |
| 2026-04-04 | research    | Anthropic 工程部落格發布三代理 harness 架構（規劃/生成/評估），支援多小時長程自主全端開發，獨立評估代理以 few-shot 校準解決自我過評問題，實測 6 小時產出完整應用                        | anthropic.com         |
| 2026-04-03 | enterprise  | Anthropic 以約 4 億美元全股票收購 AI 生技新創 Coefficient Bio（不足 10 人、全為前 Genentech 計算生物學家），加速進軍藥物研發與臨床商業化市場                                         | techcrunch.com        |
| 2026-04-03 | industry    | Anthropic 成立政治行動委員會 AnthroPAC，計畫跨黨派捐款影響 AI 法規，資金來自員工自願捐獻（上限 5,000 美元）                                                                         | techcrunch.com        |
| 2026-04-03 | research    | Anthropic 洩漏部落格揭示即將發布的 Mythos 模型可高速利用資安漏洞，現正讓特定機構提前測試以協助強化防禦                                                                               | krdo.com              |
| 2026-04-02 | claude-code | Claude Code 2.1.91 — MCP 工具結果持久化上限 500K（`_meta["anthropic/maxResultSizeChars"]`）、新增 `disableSkillShellExecution` 設定、plugin 支援 bin/ 執行檔，修復 --resume 歷史中斷與 plan mode 問題 | github.com            |
| 2026-04-01 | claude-code | Claude Code 2.1.90 — 新增 `/powerup` 互動教學功能、修復 auto mode 邊界限制、PowerShell 工具安全強化（trailing & bypass、TOCTOU 等）、大幅效能優化（SSE、MCP schema、長 session）      | github.com            |
| 2026-04-01 | enterprise  | 澳洲政府與 Anthropic 簽署 MOU：AUD $3M 學術 API 額度（ANU 等 4 所機構）、AI 安全合作、探索資料中心投資，新創最高獲 US$5 萬 API 額度支援                                              | industry.gov.au       |
| 2026-04-01 | industry    | Bloomberg：Anthropic 二級市場投資人需求大幅超越 OpenAI，企業估值熱度持續攀升，市場資金加速轉向                                                                                        | bloomberg.com         |
| 2026-03-31 | claude-code | Claude Code v2.1.88 npm source map 洩漏 — 512K 行原始碼曝光，含 44 個未發布 feature flags 和三層 memory 架構；部分功能疑為愚人節內容（BUDDY/KAIROS），Anthropic 稱打包人為失誤        | theregister.com       |
| 2026-03-31 | claude-code | Claude Code 2.1.88 — CLAUDE_CODE_NO_FLICKER 無閃爍渲染、PermissionDenied hook（auto mode 拒絕後觸發）                                                                                 | github.com            |
| 2026-03-31 | platform    | Microsoft Copilot Critique — M365 Copilot 用 Claude 審核 GPT 生成回應，DRACO benchmark 改善 13.8%                                                                                     | microsoft.com         |
| 2026-03-31 | research    | Claude 發現 Vim 和 GNU Emacs 零日 RCE 漏洞                                                                                                                                            | cybersecuritynews.com |
| 2026-03-30 | claude-code | Claude Code Computer Use（research preview）— CLI 內建 computer-use MCP server，可操控 macOS GUI，Pro/Max 方案，v2.1.85+                                                              | anthropic.com         |
| 2026-03-30 | platform    | Claude 再次服務中斷 — 東部時間 9:33AM 起大量錯誤回報                                                                                                                                  | designtaxi.com        |
| 2026-03-30 | industry    | MIT Technology Review：Pentagon 對 Anthropic 的文化戰策略已全面反噬                                                                                                                   | technologyreview.com  |
| 2026-03-30 | platform    | Anthropic 尖峰時段限流（平日 8am-2pm ET）— 非尖峰雙倍優惠 3/28 結束，回復標準限額                                                                                                     | mlq.ai                |
| 2026-03-30 | platform    | Dispatch session 修復 — Claude Desktop 的 Dispatch agent 不回應問題已修復                                                                                                             | anthropic.com         |
| 2026-03-30 | industry    | The New Stack 三月總結：14+ 產品發布、5 次服務中斷、1 次模型洩漏，稱 Anthropic 經歷「madcap March」                                                                                   | thenewstack.io        |
| 2026-03-28 | research    | Capybara 新細節 — Claude 第四階層（高於 Opus），early access 測試中，Anthropic 稱「跑起來很貴且尚未準備好正式發布」                                                                   | coindesk.com          |
| 2026-03-28 | industry    | TechCrunch：信用卡交易數據分析顯示 Claude 付費用戶創歷史新高，年化 ARR 達 $19B，在美德加法 App 排行榜均位居前二，分析師預測 2026 年中可望超越 OpenAI 營收                             | techcrunch.com        |
| 2026-03-27 | claude-code | Claude Code 2.1.86 — 新增 X-Claude-Code-Session-Id header 供 proxy 聚合、.jj/.sl VCS 排除、Read 工具去重壓縮、@file 減少 JSON 逸出 overhead，修復 --resume、VSCode 模型顯示等多項 bug | github.com            |
| 2026-03-27 | enterprise  | Bloomberg：Anthropic 正與多家華爾街銀行初步洽談，考慮最快 2026 年 10 月 IPO，與 OpenAI 競速公開上市                                                                                   | bloomberg.com         |
| 2026-03-27 | platform    | Claude 服務再度中斷 — Opus 4.6 與 Sonnet 4.6 受影響，OpenAI Pentagon 合約落空後用戶大量湧入造成基礎設施壓力                                                                           | ibtimes.com.au        |
| 2026-03-26 | research    | Claude Mythos 洩露 — Fortune 獨家：Anthropic 誤將旗艦未發布模型「Mythos」草稿留在公開資料庫，Anthropic 確認屬 CMS 設定人為失誤                                                        | fortune.com           |
| 2026-03-26 | claude-code | Claude Code 2.1.85 — 條件式 hook if 欄位、PreToolUse hook 可回覆 AskUserQuestion、MCP OAuth RFC 9728、修復 Kitty 鍵盤殘留等多項問題                                                   | github.com            |
| 2026-03-26 | industry    | 聯邦法官 Rita F. Lin 核發臨時禁制令，阻止 Trump 政府封鎖政府機構使用 Anthropic AI，Anthropic 訴訟首獲勝利                                                                             | bloomberg.com         |
| 2026-03-26 | industry    | Axios 獨家：Sam Altman 內部訊息顯示曾試圖「拯救」Anthropic，但 OpenAI 實為 Pentagon 合約最大受益者                                                                                    | axios.com             |
| 2026-03-25 | claude-code | Claude Code 2.1.83 — managed-settings.d/ drop-in 目錄、CwdChanged/FileChanged hook events、sandbox.failIfUnavailable、transcript search                                               | github.com            |
| 2026-03-25 | platform    | Claude 全球服務中斷 — 下午 UTC 起大規模斷線，社群與 DownDetector 大量回報                                                                                                             | latestly.com          |
| 2026-03-25 | industry    | DOJ 向聯邦法院聲稱 Pentagon 供應鏈風險認定合法，駁回 Anthropic 第一修正案抗辯                                                                                                         | thehill.com           |
| 2026-03-25 | industry    | Pentagon 爭議引爆熱度，Claude 衝上 Apple/Android 雙榜首，日活用戶較一月增逾 140%                                                                                                      | cnbc.com              |
| 2026-03-24 | claude-code | Claude Code Auto Mode（research preview）— AI 分類器自動審核 tool call 安全性，取代手動逐一核准，Enterprise/API 即將開放                                                              | anthropic.com         |
| 2026-03-24 | platform    | Claude Cowork Computer Use + Dispatch — Desktop app 可操控 Mac 畫面，搭配 Dispatch 從 iPhone 遠端指派任務（Pro/Max）                                                                  | anthropic.com         |
| 2026-03-24 | industry    | Pentagon 訴訟初步禁制令聽證 — 法官質疑 DoD 黑名單「看起來像在摧毀 Anthropic」                                                                                                         | reuters.com           |
| 2026-03-23 | industry    | Ramp AI Index 三月 — Anthropic 月增 4.9%，首購企業 70% 選 Anthropic，ARR $19B                                                                                                         | ramp.com              |
| 2026-03-22 | platform    | Anthropic 使用者調查（81k 人）— 不可靠性 26.7% 為最大擔憂                                                                                                                             | anthropic.com         |
| 2026-03-20 | claude-code | Claude Code 2.1.81 — --bare flag、channels 權限轉發、OAuth 並行修復                                                                                                                   | anthropic.com         |
| 2026-03-20 | claude-code | Claude Code Channels（research preview）— Telegram/Discord 遙控 session，需 v2.1.80+                                                                                                  | anthropic.com         |
| 2026-03-20 | claude-code | Claude Code Voice Mode — /voice push-to-talk                                                                                                                                          | anthropic.com         |
| 2026-03-20 | claude-code | Claude Code /loop 週期性任務                                                                                                                                                          | anthropic.com         |
| 2026-03-20 | claude-code | StopFailure hook event + ${CLAUDE_PLUGIN_DATA} plugin 持久化變數                                                                                                                      | anthropic.com         |
| 2026-03-20 | claude-code | rate_limits statusline field、effort frontmatter、settings plugin source                                                                                                              | anthropic.com         |
| 2026-03-20 | platform    | Claude inline 視覺化（圖表、diagram）                                                                                                                                                 | anthropic.com         |
| 2026-03-20 | platform    | API thinking.display: "omitted" 加速 streaming + code execution 搭配 web tools 免費                                                                                                   | anthropic.com         |
| 2026-03-20 | platform    | Opus 4.6 預設 output 64k，Opus/Sonnet 4.6 上限 128k tokens                                                                                                                            | anthropic.com         |
| 2026-03-20 | platform    | Cowork Projects — 任務/檔案/指令/記憶整合 workspace，跨 session 保留 context                                                                                                          | anthropic.com         |
| 2026-03-20 | industry    | Pentagon 訴訟 — Anthropic 提交宣誓聲明，內部文件顯示雙方曾接近共識                                                                                                                    | reuters.com           |
| 2026-03-19 | claude-code | Claude Code 2.1.79 — 目前最新版本                                                                                                                                                     | anthropic.com         |
| 2026-03-19 | claude-code | Claude Code Skills 即時進度顯示 + /skills/ 目錄預設可見                                                                                                                               | anthropic.com         |
| 2026-03-19 | claude-code | Subagent (Task tool) 權限拒絕後自動嘗試替代方案                                                                                                                                       | anthropic.com         |
| 2026-03-19 | claude-code | Memory freshness timestamps                                                                                                                                                           | anthropic.com         |
| 2026-03-19 | claude-code | Session naming + /color 指令                                                                                                                                                          | anthropic.com         |
| 2026-03-19 | claude-code | 長時間 session 記憶體優化（stream buffer/agent context/skill state 釋放）                                                                                                             | anthropic.com         |
| 2026-03-19 | claude-code | Claude API skill 內建於 Claude Code                                                                                                                                                   | anthropic.com         |
| 2026-03-19 | claude-code | 自動 continue on output token limit                                                                                                                                                   | anthropic.com         |
| 2026-03-19 | claude-code | @ file mention 效能提升（預熱索引 + session 快取）                                                                                                                                    | anthropic.com         |
| 2026-03-19 | claude-code | Plugin / worktree / startup prompts 功能                                                                                                                                              | anthropic.com         |
| 2026-03-19 | platform    | Opus 4.6 1M context GA — 不再需要 beta header                                                                                                                                         | anthropic.com         |
| 2026-03-19 | research    | Automated Alignment Agent (A3) 框架                                                                                                                                                   | anthropic.com         |
| 2026-03-19 | research    | AuditBench 對齊審計基準                                                                                                                                                               | anthropic.com         |
| 2026-03-19 | enterprise  | Anthropic 雪梨辦公室（亞太第四據點）                                                                                                                                                  | anthropic.com         |
| 2026-03-19 | enterprise  | Claude 免費方案雙倍用量促銷                                                                                                                                                           | anthropic.com         |
| 2026-03-18 | platform    | Claude Cowork Dispatch — 從手機 app 指派任務給桌面 agent，Pro/Max 可用                                                                                                                | anthropic.com         |
| 2026-03-12 | enterprise  | Anthropic 投資 $100M Claude Partner Network                                                                                                                                           | anthropic.com         |
| 2026-03-11 | enterprise  | The Anthropic Institute 成立                                                                                                                                                          | anthropic.com         |
| 2026-03-11 | platform    | Claude for Excel + PowerPoint 共享上下文 + Skills 功能                                                                                                                                | anthropic.com         |
| 2026-03-10 | industry    | Microsoft Copilot Cowork 以 Claude 驅動                                                                                                                                               | microsoft.com         |
| 2026-03-05 | platform    | Sonnet 4.6 發布 — agentic search 改進、extended thinking、1M context                                                                                                                  | anthropic.com         |
| 2026-02-24 | industry    | Anthropic 指控 DeepSeek、Moonshot AI、MiniMax 大規模蒸餾 Claude — 24,000 假帳號、1,600 萬次互動                                                                                       | anthropic.com         |
