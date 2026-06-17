# Capability-Evolution Matrix + Deprecation Timeline — Feasibility & Implementation Plan

**Status:** Planning only — nothing implemented.
**Date:** 2026-06-17
**Author:** planning pass (Claude Code)
**Scope:** New `/models` page for Claude Pulse showing a Claude model capability matrix + deprecation timeline, multi-locale, SEO-focused.

> All Claude model names, versions, capability rows, pricing, and dates in this document are **placeholder examples** chosen to illustrate the schema. They are NOT verified facts and MUST NOT ship as-is. Real data must be sourced from anthropic.com/news, official model cards, and docs.anthropic.com at build-author time and verified per the project URL-verification rule.

---

## 1. Feasibility verdict

**Verdict: feasible and worthwhile, but maintenance is the real risk — not the build.**

The build is small and a natural fit for the existing architecture. Claude Pulse already has the exact two-layer pattern this feature needs: an authoritative human-readable source (markdown table) parsed into structured objects (`parse-pulse.js`), plus per-locale string overrides (`summaries-*.json`) that fall back to the source language. The matrix is the same shape: one structured data file + per-locale label/copy overrides. No backend, no new infra, builds remain `astro build` → Cloudflare Pages.

**The honest concern is data freshness.** Unlike the pulse log (append-only event stream — old rows never go stale), the matrix is a **living-state document**: pricing changes, deprecation dates get announced, replacements shift, new capabilities land on existing models. A stale matrix is worse than no matrix for an SEO/authority play — ranking for "Claude model deprecation dates" and then showing a wrong date actively damages trust. So the data-freshness burden is genuine and ongoing, not one-time.

**Mitigation that makes it viable:** keep the dataset deliberately small and slow-moving (tiers, versions, ~10 capability columns, pricing, deprecation). Render a visible `dataAsOf` date on the page so staleness is honest and self-documenting. Decide upfront this is **manually curated** (see §6) — do not block the launch on automation. The existing `pulse-curate` LaunchAgent can _flag_ relevant news for manual matrix review later (Phase 3), but should not auto-write structured pricing/deprecation data: hallucination risk on exactly the high-stakes fields (see MEMORY: hallucination incident 2026-04-25, where the routine fabricated a version number).

**Why it's worth doing despite the burden:** it directly targets the known GSC problem (impressions concentrate on locale homepages, inner content gets none — per project memory). A capability matrix is evergreen, high-intent, long-tail search bait ("does Claude Sonnet support computer use", "Claude model 1M context", "when is Opus X deprecated"), and 5 locales multiply the surface. The pulse log can't rank for these because it's an undated-feeling event stream; a structured reference page can.

---

## 2. Data model

### 2.1 Source of truth & file location

Follow the established convention. The pulse log lives at repo-root (`claude_pulse_log.md`) and is resolved from `site/` via `../`. For the matrix, prefer a JSON file **inside the site tree** so it imports cleanly in Astro frontmatter (no `readFileSync`/`process.cwd()` gymnastics, no `..` path coupling):

```
site/src/data/models.json          ← authoritative structured data (hand-edited)
site/src/i18n/models-en.json        ← per-locale string overrides (capability labels, tier descriptions, page copy)
site/src/i18n/models-zh-CN.json
site/src/i18n/models-ja.json
site/src/i18n/models-ko.json
                                    ← zh-TW = the source strings embedded in models.json (mirrors pulse log: zh-TW is source)
```

Rationale for JSON-in-site vs markdown-at-root:

- The pulse log is markdown because humans append prose summaries daily and a table reads well in git diffs. The matrix is a **structured grid** (booleans, dates, prices) — JSON expresses that far better and validates more easily.
- Importing `../data/models.json` with `import models from "../data/models.json"` is simpler than the log's `readFileSync(resolve(process.cwd(), "..", ...))`.
- Keep zh-TW as the embedded source language (consistent with the log being zh-TW-authored), with EN/zh-CN/JA/KO as overlay files that fall back to source — identical to the `summaries-*.json` mechanism.

### 2.2 Schema (compact)

Design is **generic** — no hardcoded model list. Tiers, versions, and capability keys are all data-driven so adding "Fable 6" or a new capability is a pure data edit.

```jsonc
{
  "schemaVersion": 1,
  "dataAsOf": "2026-06-17", // rendered on page for honest staleness

  // Capability dimension definitions (columns). Order = display order.
  // labelKey resolves against models-{locale}.json; falls back to "label" (zh-TW source).
  "capabilities": [
    { "key": "context1m", "label": "1M context", "labelKey": "cap.context1m" },
    { "key": "vision", "label": "視覺輸入", "labelKey": "cap.vision" },
    { "key": "toolUse", "label": "工具使用", "labelKey": "cap.toolUse" },
    {
      "key": "computerUse",
      "label": "Computer Use",
      "labelKey": "cap.computerUse",
    },
    { "key": "thinking", "label": "延伸思考", "labelKey": "cap.thinking" },
    { "key": "mcp", "label": "MCP", "labelKey": "cap.mcp" },
    // ...add columns as data, not code
  ],

  // One entry per model VERSION. Tier groups versions for display.
  "models": [
    {
      "id": "EXAMPLE-opus-x.y", // stable slug, used for anchors/JSON-LD @id
      "tier": "Opus", // free-text tier label (Opus/Sonnet/Haiku/Fable/Mythos/...)
      "displayName": "Claude Opus X.Y", // EXAMPLE — do not ship
      "version": "X.Y",
      "releaseDate": "2026-01-01", // ISO; null if unknown
      "status": "current", // current | legacy | deprecated | retired
      "deprecationDate": null, // ISO date deprecation announced/effective, or null
      "retirementDate": null, // ISO date API access ends, or null
      "replacement": null, // model id string recommended as successor, or null
      "pricing": {
        // per the model card; currency USD per 1M tokens
        "currency": "USD",
        "unit": "1M tokens",
        "input": 0.0, // EXAMPLE placeholder
        "output": 0.0, // EXAMPLE placeholder
        "cachedInput": null, // optional tiers
        "note": null, // e.g. "tiered >200K context"
      },
      // Capabilities as a map keyed by capabilities[].key.
      // Value encodes both support AND when it first arrived (capability-over-time).
      "capabilities": {
        "context1m": { "supported": true, "since": "2026-01-01" },
        "vision": { "supported": true, "since": "2026-01-01" },
        "toolUse": { "supported": true, "since": "2026-01-01" },
        "computerUse": { "supported": false, "since": null },
        "thinking": { "supported": true, "since": "2026-01-01" },
        "mcp": { "supported": true, "since": "2026-01-01", "note": "beta" },
      },
      "sourceUrl": "https://www.anthropic.com/news/EXAMPLE", // provenance, verified 200
      "modelCardUrl": null,
    },
    // ... more versions; an empty array renders an honest empty state.
  ],
}
```

**How "capabilities over time" is represented:** each capability cell carries `supported` + `since` (the version/date it first appeared on that model line). This lets the page answer both "which models support X today" (filter `supported:true`) and "which model _first_ supported X" (min `since` across models where supported) — the headline SEO query. A separate derived timeline view (§3) can sort capabilities by earliest `since` to show the evolution arc without storing a second copy of the data.

**Why a flat version list (not nested tier→versions):** flat is easier to hand-edit, diff, and sort; tier grouping is a render-time `groupBy(tier)`, not a storage concern. Mirrors how the pulse log is a flat row list grouped into day-separators at render time.

### 2.3 Per-locale strings file shape

Same fall-back mechanism as `summaries-*.json` (key lookup, fall back to source). Only **labels and prose** are translated; **data** (dates, prices, booleans, version numbers, model ids) is locale-independent and lives once in `models.json`.

```jsonc
// models-en.json
{
  "page": {
    "title": "Claude Model Capability Matrix & Deprecation Timeline",
    "metaDescription": "Which Claude model supports 1M context, vision, tool use, computer use...; pricing and deprecation dates.",
    "h1": "Claude Models — Capabilities, Pricing & Deprecation",
    "intro": "...",
    "asOf": "Data as of {date}",
    "colModel": "Model",
    "colReleased": "Released",
    "colStatus": "Status",
    "colDeprecation": "Deprecation",
    "colReplacement": "Recommended replacement",
    "colInput": "Input $/1M",
    "colOutput": "Output $/1M",
    "status": {
      "current": "Current",
      "legacy": "Legacy",
      "deprecated": "Deprecated",
      "retired": "Retired",
    },
    "supported": "Yes",
    "notSupported": "—",
    "since": "since {date}",
  },
  "cap": {
    "context1m": "1M context",
    "vision": "Vision",
    "toolUse": "Tool use",
    "computerUse": "Computer use",
    "thinking": "Extended thinking",
    "mcp": "MCP",
  },
}
```

---

## 3. Page / rendering design

### 3.1 Routing (match existing locale layout)

`en` is the default locale at root; others live in subdirs (verified: `astro.config.mjs` `prefixDefaultLocale: false`). Mirror the homepage's thin-wrapper pattern — each page is a 5-line wrapper around one shared component.

```
site/src/pages/models/index.astro            → <ModelsPage locale="en" />
site/src/pages/zh-TW/models/index.astro      → <ModelsPage locale="zh-TW" />
site/src/pages/zh-CN/models/index.astro      → <ModelsPage locale="zh-CN" />
site/src/pages/ja/models/index.astro         → <ModelsPage locale="ja" />
site/src/pages/ko/models/index.astro         → <ModelsPage locale="ko" />
site/src/components/ModelsPage.astro         → shared render component
site/src/lib/parse-models.js                 → loads models.json + merges locale strings (mirrors parse-pulse.js)
```

`trailingSlash: "always"` is configured, so URLs are `/models/`, `/ja/models/`, etc. Sitemap integration picks them up automatically (no config change needed; the `@astrojs/sitemap` i18n block already maps all 5 locales).

### 3.2 What's translated vs what's data

| Translated (per-locale string files)         | Data (single source, locale-independent)    |
| -------------------------------------------- | ------------------------------------------- |
| Page title, meta description, H1, intro      | Model ids, version numbers, tiers           |
| Column headers, status labels                | Release/deprecation/retirement dates        |
| Capability column labels                     | Prices (USD), capability booleans + `since` |
| "since {date}", "Data as of {date}" wrappers | Source/model-card URLs                      |

This is the same split as the homepage: categories/UI strings are translated, the actual log content is rendered from data with a per-locale summary overlay.

### 3.3 Two views (progressive)

1. **Matrix table (primary, MVP):** rows = model versions (grouped by tier with a tier sub-header row), columns = capabilities + pricing + status + deprecation + replacement. Each capability cell shows Yes/— and `since {date}` on hover/secondary line. Status uses a colored chip reusing the existing category-dot CSS vocabulary (terracotta accent palette already in `:root`).
2. **Deprecation timeline (secondary, Phase 2):** a vertical timeline reusing the homepage `day-separator` visual language, sorted by date, marking release → deprecation → retirement events with replacement arrows. Pure render derivation from the same data.

### 3.4 Mobile (a wide matrix is the hard part)

A capability matrix with ~10 columns × N rows does not fit a 375px viewport. Options, in order of preference:

- **Card-per-model on narrow screens** (`@media max-width: 640px`): collapse each row into a stacked card (model name + status + price header, then a 2-col capability grid). This matches the homepage's mobile card aesthetic and keeps content crawlable (it's the same DOM, just re-flowed via CSS — no JS, no hidden content).
- Avoid horizontal-scroll-only tables (poor UX, and offscreen content can hurt perceived quality). If a scroll table is used as a fallback, pin the model-name column (`position: sticky; left: 0`).
- Keep it CSS-only/no-JS where possible (the homepage's only JS is filters/status/time — the matrix MVP needs no JS at all, which is good for LCP and crawlability).

### 3.5 SEO specifics

This is the point of the feature, so be deliberate:

- **Title/meta/H1:** keyword-targeted per locale (e.g. EN H1 "Claude Models — Capabilities, Pricing & Deprecation"). Distinct `<title>`/`metaDescription` from the homepage.
- **Headings:** one `<h1>`, `<h2>` per tier, semantic `<table>` with `<caption>`, `<th scope>` — helps both a11y and SERP table features.
- **JSON-LD structured data (NEW — site has none today):** inject a `<script type="application/ld+json">` in `<head>`. Use `Dataset` or an `ItemList` of `SoftwareApplication`/`Product`-ish entries, or simplest: a `FAQPage`/`Table`-friendly `BreadcrumbList` + `Dataset`. Concretely, a `Dataset` describing the matrix plus per-model entries. This needs a small Base.astro extension (slot for head JSON-LD) — see §4.
- **Canonical + hreflang (NEW — currently missing in Base.astro):** add `<link rel="canonical">` and `<link rel="alternate" hreflang>` for all 5 locales + `x-default`. This is a **pre-existing SEO gap** on the whole site; adding it for the matrix is the right moment to add a reusable mechanism (and it incidentally helps the homepages that are currently the only ranking pages).
- **Internal linking:** add a nav link from the homepage header (and footer) to `/models/`. Internal links from the highest-authority pages (the locale homepages that already get all the impressions) are the single most valuable SEO lever here — it passes their authority to the new inner page, directly attacking the "inner content gets no impressions" problem.
- **RSS:** the matrix is not an event stream; do **not** add it to the feed. Optionally emit a one-line pulse-log entry when the matrix gets a significant update (manual).
- **`dataAsOf` visible on page:** freshness signal for both users and crawlers.

---

## 4. Implementation plan

### 4.1 Files to create

| File                                      | Purpose                                                                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `site/src/data/models.json`               | authoritative structured data (start with 2-3 clearly-marked example rows, then replace with verified data before launch)  |
| `site/src/i18n/models-en.json`            | EN page copy + capability labels                                                                                           |
| `site/src/i18n/models-zh-CN.json`         | zh-CN strings                                                                                                              |
| `site/src/i18n/models-ja.json`            | JA strings                                                                                                                 |
| `site/src/i18n/models-ko.json`            | KO strings                                                                                                                 |
| `site/src/lib/parse-models.js`            | load `models.json`, merge per-locale strings with source fallback, derive sorted/grouped views + "first-supported" lookups |
| `site/src/components/ModelsPage.astro`    | shared render component (table + mobile cards + JSON-LD)                                                                   |
| `site/src/pages/models/index.astro`       | EN route wrapper                                                                                                           |
| `site/src/pages/zh-TW/models/index.astro` | zh-TW route wrapper                                                                                                        |
| `site/src/pages/zh-CN/models/index.astro` | zh-CN route wrapper                                                                                                        |
| `site/src/pages/ja/models/index.astro`    | JA route wrapper                                                                                                           |
| `site/src/pages/ko/models/index.astro`    | KO route wrapper                                                                                                           |

### 4.2 Files to modify

| File                                        | Change                                                                                                                                                                                                                | Risk                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `site/src/layouts/Base.astro`               | (a) add optional `<slot name="head">` or `jsonLd`/`canonical`/`hreflang` props so pages can inject structured data + canonical/hreflang; (b) add canonical+hreflang generation. Backward-compatible (props optional). | Low — additive. Touches shared layout, so smoke-test homepage build after. |
| `site/src/components/HomePage.astro`        | add a nav link to `/models/` in header (and/or footer). Add the link label to each locale's `i18n/*.json`.                                                                                                            | Low                                                                        |
| `site/src/i18n/{en,zh-TW,zh-CN,ja,ko}.json` | add one nav-label string (e.g. `"navModels": "Models"`).                                                                                                                                                              | Low                                                                        |

No change needed to `astro.config.mjs` (sitemap auto-discovers pages; i18n already configured).

### 4.3 How it reuses existing patterns

- **`parse-models.js` mirrors `parse-pulse.js`:** same idea — load source, build a per-locale string map, fall back to source language when a locale lacks a translation. Difference: import JSON directly instead of reading/parsing markdown.
- **Thin page wrappers** mirror `pages/index.astro` (`<HomePage locale="en" />`).
- **Locale string fallback** mirrors `summaries-*.json` lookup-with-fallback in `parse-pulse.js` lines 109-114.
- **CSS design tokens** (`--accent`, `--border`, `--font-*`, status-dot colors) are reused from `Base.astro` `:root` and HomePage — no new palette.
- **Status chips** reuse the `data-indicator` colored-dot pattern already in HomePage's status link.

### 4.4 Phased rollout

- **Phase 0 — data spike (½ day):** author `models.json` with verified current data for a handful of models. This is the real bottleneck (sourcing + URL verification), not the code. Verify every `sourceUrl` returns 200 (project rule). Mark anything unverifiable `[UNVERIFIED]` and exclude.
- **Phase 1 — MVP (1 day):** EN-only `/models/` static table + mobile cards, no JSON-LD yet, homepage link. Ship and confirm it builds + deploys. Validates the data model and render against real data before multiplying across 5 locales.
- **Phase 2 — full SEO + i18n (1-1.5 days):** add 4 locales, JSON-LD, canonical/hreflang in Base.astro, deprecation timeline view, GSC submission. (hreflang/canonical also benefits homepages.)
- **Phase 3 — maintenance hooks (optional, later):** extend `pulse-curate` to _flag_ model/pricing/deprecation news into a review queue (NOT auto-write). Manual operator updates `models.json` + bumps `dataAsOf`.

### 4.5 Effort estimate

| Phase                                     | Effort                                 |
| ----------------------------------------- | -------------------------------------- |
| Phase 0 data spike                        | 0.5 day (mostly sourcing/verification) |
| Phase 1 MVP                               | 1 day                                  |
| Phase 2 full i18n + SEO                   | 1-1.5 days                             |
| Phase 3 maintenance automation (optional) | 1 day                                  |
| **Total to full launch (P0-P2)**          | **~2.5-3 days**                        |

Code is the small part; the recurring cost is data upkeep.

---

## 5. Risks & mitigations

| Risk                                                                                              | Severity | Mitigation                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stale data on a high-trust SEO page** (wrong deprecation date / price) actively harms authority | High     | Visible `dataAsOf`; deliberately small slow-moving dataset; manual curation with verification; quarterly review cadence (§6)                              |
| **Hallucinated pricing/version data** if automated (cf. 2026-04-25 incident)                      | High     | Phase 3 automation _flags only_, never writes structured fields; human verifies against model card                                                        |
| **Unverified URLs** in `sourceUrl`                                                                | Med      | Enforce project URL-verification rule (HEAD 200) at author time; exclude `[UNVERIFIED]`                                                                   |
| **Base.astro change breaks homepage** (shared layout)                                             | Med      | Make all new props optional/additive; `npm run build` smoke test on homepage after edit                                                                   |
| **Translation drift** (matrix copy in 5 locales falls out of sync)                                | Med      | Fall-back-to-source mechanism means missing translations degrade gracefully to zh-TW, never break; matrix has far less prose than the log                 |
| **Wide table unusable on mobile**                                                                 | Med      | CSS card reflow (same DOM, crawlable), not JS-hidden content                                                                                              |
| **No SEO payoff** (page doesn't rank)                                                             | Med      | Internal links from high-authority homepages; structured data; long-tail keyword targeting; this is a bet, accept it per user's side-project philosophy   |
| **Fictional-timeline model names** make verification awkward                                      | Low      | Schema is generic; data sourced from the project's own canonical source (anthropic.com/news as it exists in-timeline), same as the pulse log already does |

---

## 6. Maintenance plan

- **Owner:** the human curator (same person running pulse curation). Single owner, single file (`models.json`).
- **Cadence:** review on (a) any new model launch, (b) any pricing change, (c) any deprecation/retirement announcement, and (d) a standing quarterly sweep regardless. Bump `dataAsOf` on every edit — the visible date is the freshness contract.
- **Process:** edit `models.json` → verify each touched `sourceUrl` returns 200 → `cd site && npm run build` → commit → push `main` (GitHub Actions deploys). Optionally log a pulse entry for significant matrix updates.
- **Automation boundary (Phase 3):** `pulse-curate` may surface candidate model/pricing/deprecation news into a review list, but the operator transcribes verified values into `models.json` by hand. Do not let the LaunchAgent write pricing/deprecation/version fields directly — those are exactly the fields where a hallucination is most damaging and hardest to notice.

---

## 7. Open questions for the user

1. URL slug preference: `/models/` (recommended — clearer, more keyword-relevant) vs `/matrix/`?
2. Include pricing columns at launch, or capabilities + deprecation only? (Pricing changes most often → highest maintenance cost.)
3. Should a significant matrix update also post a one-line entry to the pulse log/RSS, or stay silent?
4. Acceptable launch with EN-only (Phase 1) shipped first, or hold for all 5 locales together?
