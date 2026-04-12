# Claude Pulse Redesign Plan

## Aesthetic Direction: Anthropic Editorial

從 "Signal Observatory" 深空監測站轉向 **Anthropic-inspired editorial** 風格 — 以 anthropic.com 的設計語言為參考基礎，但不是複製品牌、而是承襲其設計哲學。

### Anthropic 設計語言分析（取自 anthropic.com）

| 元素   | Anthropic 實際做法                                                               |
| ------ | -------------------------------------------------------------------------------- |
| 背景   | 深色底 `#131314` 搭配 cream `rgba(250, 249, 240)` 表面                           |
| 強調色 | Terracotta `#d97757`（鏽紅/陶土色），selection 用 `rgba(204, 120, 92, 0.5)`      |
| 字型   | 未公開特定字型名稱，使用 fluid `clamp()` sizing                                  |
| 排版   | 12 欄 grid，大量留白，fluid responsive（無固定斷點）                             |
| 動態   | 克制 — word-by-word text reveal、hover scale 1.05，尊重 `prefers-reduced-motion` |
| 調性   | Premium、editorial、學術感 — 不花俏但有質感                                      |

### Claude Pulse 的轉譯

我們不是 Anthropic 官方產品，是一個關於 Claude 生態系的新聞追蹤站。設計定位：

> **像是 Anthropic 的 devrel 團隊做的 changelog 頁面 — 溫暖、克制、有質感的 editorial 風格。**

Design keywords: **Warm. Editorial. Restrained. Refined.**

- 從冷色深藍暗黑模式 → 轉為 **暖色 cream 底 + 深色文字**（light mode）
- 從 neon glow 效果 → 轉為 **terracotta 暖色強調** + 精緻陰影
- 從 terminal/monitor 隱喻 → 轉為 **editorial/briefing** 質感
- 保留：分類色系（微調色調以配合暖底）、篩選功能、時間軸結構

---

## Typography

### Font Pairing

**Display / Headings:** `Newsreader` (Google Fonts)

- Transitional serif，帶有 editorial 學術感 — 與 Anthropic 的精緻調性一致
- 不是常見的 AI 界面字型，有辨識度
- Optical size 支援，小字號到大標題都清晰
- Weight 500 for headings, 400 for body serif accents
- Use for: site title, date headings

**Body / UI:** `Source Sans 3` (Google Fonts)

- Adobe 開源 humanist sans，比 Inter 暖、比 system fonts 有個性
- 極佳的 CJK 混排相容性（與 Noto Sans TC 的 x-height 接近）
- Use for: card summaries, buttons, filter labels, general UI

**Monospace accent:** `IBM Plex Mono` (Google Fonts)

- 用於 source labels、metadata — 暗示「這是資料」
- 與 humanist sans 的搭配比 JetBrains Mono 柔和

**Chinese:** `Noto Sans TC` 400 + 500 作為 fallback。

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Source+Sans+3:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+TC:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

```css
--font-display: "Newsreader", "Noto Sans TC", Georgia, serif;
--font-body: "Source Sans 3", "Noto Sans TC", system-ui, sans-serif;
--font-mono: "IBM Plex Mono", "Noto Sans TC", ui-monospace, monospace;
```

---

## Color System

### 核心轉變：Dark → Warm Light

參考 Anthropic 的 cream/terracotta 配色，但加入自己的層次。

```css
:root {
  /* Backgrounds — warm cream layering */
  --bg: #faf9f0; /* 頁面底色：Anthropic 的 cream */
  --bg-surface: #f5f3e8; /* 卡片底色：略深的 parchment */
  --bg-surface-hover: #efede0; /* 卡片 hover */
  --bg-header: #faf9f0; /* header 底色 */

  /* Text hierarchy — deep warm neutrals */
  --text: #1a1a1b; /* 主要文字：近黑（參考 Anthropic #131314） */
  --text-secondary: #5c5a52; /* 次要文字 */
  --text-tertiary: #9c9889; /* 第三層：日期、metadata */

  /* Accent — Anthropic terracotta */
  --accent: #d97757; /* 主強調色：直接取自 anthropic.com */
  --accent-light: #e8956f; /* hover 狀態 */
  --accent-bg: rgba(217, 119, 87, 0.08); /* 淡底色 */
  --accent-border: rgba(217, 119, 87, 0.25);

  /* Borders — warm gray */
  --border: #e5e2d6; /* 預設邊線 */
  --border-hover: #d4d0c2; /* hover 邊線 */

  /* Category colors — 暖色調整版，在 cream 底上保持可讀 */
  --cat-code: #2563eb; /* blue-600：在淺底上需要更深 */
  --cat-code-bg: rgba(37, 99, 235, 0.07);
  --cat-platform: #059669; /* emerald-600 */
  --cat-platform-bg: rgba(5, 150, 105, 0.07);
  --cat-research: #7c3aed; /* violet-600 */
  --cat-research-bg: rgba(124, 58, 237, 0.07);
  --cat-industry: #d97706; /* amber-600 */
  --cat-industry-bg: rgba(217, 119, 6, 0.07);
  --cat-enterprise: #dc2626; /* red-600 */
  --cat-enterprise-bg: rgba(220, 38, 38, 0.07);

  /* Spacing tokens (8px grid) */
  --sp-1: 0.5rem;
  --sp-2: 1rem;
  --sp-3: 1.5rem;
  --sp-4: 2rem;
  --sp-6: 3rem;
  --sp-8: 4rem;
}
```

### 為什麼選 light mode

1. Anthropic 的 public-facing 頁面主要是 light/cream 底
2. Editorial/briefing 質感在暖色淺底上更自然
3. 與市面上大多數 AI dashboard 的 dark mode 形成區隔
4. 繁體中文在淺底深字的可讀性更好

---

## Layout Changes

### Overall Structure

- Max-width 維持 `48rem`（768px） — editorial 排版不需要太寬，窄欄反而更好讀
- 大量留白：content area 兩側保留 `clamp(1.5rem, 4vw, 3rem)` margin
- 垂直節奏：date group 間距從 1.5rem 拉到 2.5rem

### Header Redesign

從功能性 bar → **editorial masthead** 風格：

```
                    Claude Pulse
           Anthropic / Claude 動態追蹤

                      [RSS]
  ─────────────────────────────────────────
```

- "Claude Pulse" 用 `Newsreader 600`，1.75rem，居中
- 副標題用 `Source Sans 3 400`，0.875rem，`--text-tertiary`，居中
- RSS link 移到副標題下方，小型 pill 樣式
- 底線：1px `--border`，但在中央有一小段（約 3rem）用 `--accent`：

```css
.header-line {
  width: 100%;
  height: 1px;
  background: var(--border);
  position: relative;
}
.header-line::after {
  content: "";
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 3rem;
  height: 1px;
  background: var(--accent);
}
```

這個中央強調線是 Anthropic 風格的精緻細節 — 不張揚但有記憶點。

### Filter Bar Redesign

從 pill buttons → **inline text tabs**，更 editorial：

```
分類   全部 · Claude Code · Platform · Research · Industry · Enterprise
時間   7 天 · 30 天 · 全部
```

- 項目間用 `·`（middle dot）分隔，不用 border/pill
- Active 狀態：`--accent` 色文字 + 底部 2px underline
- Hover：`--text` 色（從 `--text-secondary` 變深）
- 分類色以 dot indicator 保留（`●` 小圓點在文字前）

```css
.filter-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 0.25rem 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.filter-btn:hover {
  color: var(--text);
}

.filter-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.filter-separator {
  color: var(--border);
  margin: 0 0.25rem;
  user-select: none;
}
```

### Date Headings

Editorial 風格：日期 + 計數，用 hairline 分隔：

```
2026-04-09                                          6 則
───────────────────────────────────────────────────────
```

- 日期用 `Newsreader 500`，0.9375rem
- 計數用 `Source Sans 3`，0.75rem，`--text-tertiary`
- 底線 1px `--border`

```css
.date-heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.75rem;
}

.date-heading-text {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.date-heading-count {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--text-tertiary);
}
```

### Card Redesign

從 bordered box → **open card with subtle bottom border** — 像報紙的文章列表：

```
┌──────────────────────────────────────────────────────┐
│  ● Claude Code                                       │
│                                                      │
│  Claude Code 2.1.97 — focus view toggle...           │
│                                                      │
│  github.com                              2026-04-08  │
├──────────────────────────────────────────────────────┤
│  （下一張卡片）                                       │
```

- 無外框（no border），改用底部 hairline 分隔
- Hover 時整張卡片背景微微變暖（`--bg-surface` → `--bg-surface-hover`）
- 左側不再有色條，改為 category badge 的色點

```css
.card {
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;
}

.card:last-child {
  border-bottom: none;
}

.card:hover {
  background: var(--bg-surface-hover);
  margin: 0 -1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  border-bottom-color: transparent;
}
```

**Category badge** — 精簡到最小：色點 + 文字標籤

```css
.card-category {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--cat-color);
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.cat-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--cat-color);
}
```

**Card summary** — 正文用 `Source Sans 3`，行高拉到 1.7：

```css
.card-summary {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--text);
}
```

**Card footer** — source + 可選的日期：

```css
.card-source {
  display: block;
  margin-top: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
}
```

---

## Animation & Motion Design

Anthropic 的動態策略是**極度克制** — 我們遵循同樣原則。

### 1. Card Entry（唯一的 page-load 動畫）

淡入 + 微幅上移，stagger by card index：

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.card:nth-child(1) {
  animation-delay: 0ms;
}
.card:nth-child(2) {
  animation-delay: 50ms;
}
.card:nth-child(3) {
  animation-delay: 100ms;
}
.card:nth-child(4) {
  animation-delay: 150ms;
}
.card:nth-child(5) {
  animation-delay: 200ms;
}
.card:nth-child(6) {
  animation-delay: 250ms;
}
```

使用 Anthropic 同款 easing：`cubic-bezier(0.16, 1, 0.3, 1)`

### 2. Hover Transitions

所有 hover 效果用 `0.15s ease` — 快速但不突兀：

```css
.card {
  transition: background 0.15s ease;
}
.filter-btn {
  transition:
    color 0.15s,
    border-color 0.15s;
}
a {
  transition: color 0.15s;
}
```

### 3. 不做的事

- 不做 pulse dot 動畫（太 techy，不符合 editorial 調性）
- 不做 scan line（太 sci-fi）
- 不做 glow 效果（與暖色系衝突）
- 不做 background grid（editorial 不需要）

### 4. `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
```

---

## Background & Atmosphere

不用 grid、aurora、scanline。改用更精緻的手法：

### Subtle Noise Texture（可選）

在 `body` 上加一層極淡的 noise grain，模擬紙張質感：

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}
```

這在 cream 底上產生極淡的紙張質感。opacity 0.03 幾乎不可見，但潛意識能感受到不是純平面。

### Terracotta Accent Line

Header 底部的居中短線（前述）是唯一的「裝飾」元素 — 一條 3rem 的 terracotta 線段。

---

## Files to Modify

### 1. `site/src/lib/parse-pulse.js`

更新分類色至 `-600` 系列（配合淺底），加 `bg` 欄位：

```js
const CATEGORY_LABELS = {
  "claude-code": {
    label: "Claude Code",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.07)",
  },
  platform: {
    label: "Platform",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.07)",
  },
  research: {
    label: "Research",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.07)",
  },
  industry: {
    label: "Industry",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.07)",
  },
  enterprise: {
    label: "Enterprise",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.07)",
  },
};
```

- `parsePulseLog()` 在每個 item 加上 `categoryBg` 欄位
- `getCategories()` 回傳包含 `bg` 的完整物件

### 2. `site/src/layouts/Base.astro`

全面改寫：

1. **`<head>`**：加 Google Fonts preconnect + stylesheet（4 families）
2. **`:root`**：替換為新的暖色 CSS variables（完整色彩系統 + spacing tokens + font stacks）
3. **`body`**：
   - `background: var(--bg)` cream 底色
   - `font-family: var(--font-body)`
   - `color: var(--text)`
   - `-webkit-font-smoothing: antialiased`
4. **`body::before`**：noise texture overlay（可選）
5. **`a`** 連結色改為 `var(--accent)`，hover 用 `var(--accent-light)`

### 3. `site/src/pages/index.astro`

**Template 改動：**

1. **Header**：
   - 改為居中排版（`text-align: center`）
   - 移除 flex justify-between
   - 加上 `.header-line` div（含居中 terracotta accent）
   - RSS link 改為小型居中 pill

2. **Filters**：
   - 改用 inline text tabs + `·` separator
   - Category buttons 前加 `●` 色點
   - 移除 pill 樣式，改用 underline active 狀態

3. **Date headings**：
   - `<h2>` 改為 flex row：左邊日期 + 右邊計數
   - 加 `{dateItems.length} 則` 在右側

4. **Cards**：
   - 移除 border box，改用底部 hairline
   - Category badge 改為色點 + uppercase label
   - 每張 card 的 inline style 傳入 `--cat-color`
   - Source 改用 monospace

**Style 完全重寫** — 替換整個 `<style>` block。

### 4. `site/src/pages/feed.xml.js`

不需改動（RSS feed 不受視覺影響）。

---

## Responsive Design

| Breakpoint | Width    | Changes                                         |
| ---------- | -------- | ----------------------------------------------- |
| Mobile     | < 640px  | Header 字型縮小；filter 換行；card padding 減少 |
| Tablet+    | >= 640px | 完整版面                                        |

```css
@media (max-width: 640px) {
  .header h1 {
    font-size: 1.375rem;
  }
  .subtitle {
    font-size: 0.8125rem;
  }
  .filter-group {
    gap: 0.125rem;
  }
  .card-summary {
    font-size: 0.875rem;
  }
}
```

不做兩欄 grid — editorial 風格在窄欄單欄閱讀最佳。

---

## Accessibility

- 所有文字 contrast ratio 通過 WCAG AA：
  - `--text` (#1a1a1b) on `--bg` (#faf9f0) ≈ 16:1 (AAA)
  - `--text-secondary` (#5c5a52) on `--bg` (#faf9f0) ≈ 6.5:1 (AA)
  - `--accent` (#d97757) on `--bg` (#faf9f0) ≈ 3.8:1 (AA Large Text only) — 僅用於 UI 元素，不用於小字正文
- Category colors 用 `-600` 系列確保在淺底上可讀
- Filter buttons 加 `aria-pressed` 狀態
- `body::before` noise overlay 加 `pointer-events: none`
- Focus styles：`outline: 2px solid var(--accent); outline-offset: 2px`
- `prefers-reduced-motion` 停用所有動畫

---

## Performance Budget

| Asset        | Impact                                                            |
| ------------ | ----------------------------------------------------------------- |
| Google Fonts | 4 families, `display=swap` — ~30KB CSS（cached after first load） |
| Noise SVG    | inline data URI — 0 requests                                      |
| Animations   | CSS-only, GPU composited — 0ms JS cost                            |
| JS bundle    | 無變動 — 維持 vanilla JS client-side filtering                    |

Build output 維持純靜態 HTML。無新依賴。

---

## Implementation Order

1. `parse-pulse.js` — 更新分類色、加 `bg` 欄位
2. `Base.astro` — 字型載入、色彩系統、body 樣式
3. `index.astro` template — header 居中、filter inline tabs、date heading 結構、card 結構
4. `index.astro` styles — 全部重寫
5. Build test：`cd site && npm run build`
6. Browser review：確認中文渲染、contrast ratio、hover 效果
7. 可選：評估 noise texture 是否需要

---

## Before vs After 摘要

| 元素    | Before                 | After                                      |
| ------- | ---------------------- | ------------------------------------------ |
| 背景    | 冷色深藍 `#0f172a`     | 暖色 cream `#faf9f0`                       |
| 文字    | 淺色 `#e2e8f0` on dark | 深色 `#1a1a1b` on light                    |
| 強調色  | Sky blue `#38bdf8`     | Terracotta `#d97757`                       |
| 字型    | System fonts           | Newsreader + Source Sans 3 + IBM Plex Mono |
| Header  | 左對齊功能列           | 居中 editorial masthead                    |
| Filters | Pill buttons           | Inline text tabs + underline               |
| Cards   | Bordered boxes         | Open cards with hairline separators        |
| 動態    | 無                     | 淡入 stagger（克制）                       |
| 裝飾    | 無                     | 居中 terracotta accent line + 可選紙張紋理 |
| 調性    | Generic dark dashboard | Anthropic-inspired editorial briefing      |
