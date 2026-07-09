import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import summariesEn from "../i18n/summaries-en.json" with { type: "json" };
import summariesZhCN from "../i18n/summaries-zh-CN.json" with { type: "json" };
import summariesJa from "../i18n/summaries-ja.json" with { type: "json" };
import summariesKo from "../i18n/summaries-ko.json" with { type: "json" };

const LOCALE_SUMMARIES = {
  en: summariesEn,
  "zh-CN": summariesZhCN,
  ja: summariesJa,
  ko: summariesKo,
};

// Group separator anchored to curator's local timezone (Hanoi). Card timestamps
// remain in viewer's browser TZ; this only controls day-grouping so v2.1.119
// (23:24 UTC = 06:24 Hanoi next day) appears under the Hanoi date.
const DISPLAY_TZ = "Asia/Ho_Chi_Minh";
const displayDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DISPLAY_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function toDisplayDate(isoUtc) {
  const parts = displayDateFormatter.formatToParts(new Date(isoUtc));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

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

export function parsePulseLog() {
  const logPath = resolve(process.cwd(), "..", "claude_pulse_log.md");
  const content = readFileSync(logPath, "utf-8");

  const lines = content.split("\n");
  const items = [];
  const keyCounts = {}; // track duplicates for #N suffix

  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue;
    if (line.includes("| date")) continue;

    // Split on unescaped pipes only — summaries may contain literal "|" as "\|"
    // (markdown table escape), which is unescaped back after splitting.
    const cells = line
      .split(/(?<!\\)\|/)
      .map((cell) => cell.trim().replaceAll("\\|", "|"))
      .filter(Boolean);

    // New schema has 6 columns: date | time | category | summary | source | url
    // Legacy schema had 4 columns: date | category | summary | source
    if (cells.length < 4) continue;

    let date, time, category, summary, source, url;
    if (cells.length >= 6 && /^\d{2}:\d{2}$/.test(cells[1])) {
      [date, time, category, summary, source, url] = cells;
    } else {
      // Legacy fallback
      [date, category, summary, source] = cells;
      time = "08:00";
      url = `https://${source}`;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const meta = CATEGORY_LABELS[category] || {
      label: category,
      color: "#6b7280",
      bg: "rgba(107, 114, 128, 0.07)",
    };

    // Build ISO datetime string in UTC
    const datetimeUtc = `${date}T${time}:00Z`;

    // Build lookup key with #N suffix for duplicate (date|category|source) triples.
    const baseKey = `${date}|${category}|${source}`;
    keyCounts[baseKey] = (keyCounts[baseKey] || 0) + 1;
    const lookupKey =
      keyCounts[baseKey] === 1 ? baseKey : `${baseKey}#${keyCounts[baseKey]}`;

    // Per-locale summaries. Fall back to zh-TW source (`summary`) if a locale
    // hasn't translated this entry yet.
    const summaries = { "zh-TW": summary };
    for (const [loc, dict] of Object.entries(LOCALE_SUMMARIES)) {
      summaries[loc] = dict[lookupKey] || summary;
    }

    const displayDate = toDisplayDate(datetimeUtc);

    items.push({
      date,
      time,
      datetimeUtc,
      displayDate,
      // Month bucket for archive pages, aligned with day-separator grouping.
      month: displayDate.slice(0, 7),
      // Stable per-item anchor id, derived from the same key that indexes
      // the summary JSONs — survives rebuilds, unlike a positional index.
      anchor: lookupKey.replace(/[^a-zA-Z0-9]+/g, "-"),
      category,
      categoryLabel: meta.label,
      categoryColor: meta.color,
      categoryBg: meta.bg,
      summary,
      summaryEn: summaries.en,
      summaries,
      source,
      url,
    });
  }

  // Sort by datetime descending (newest first)
  items.sort((a, b) => b.datetimeUtc.localeCompare(a.datetimeUtc));

  return items;
}

// Unique months (YYYY-MM, newest first) that have at least one item.
export function getArchiveMonths(items = parsePulseLog()) {
  return [...new Set(items.map((item) => item.month))].sort((a, b) =>
    b.localeCompare(a),
  );
}

export function getCategories() {
  return Object.entries(CATEGORY_LABELS).map(([key, val]) => ({
    key,
    ...val,
  }));
}
