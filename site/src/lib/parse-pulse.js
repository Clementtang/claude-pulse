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
    const month = displayDate.slice(0, 7);
    // Week-of-month from the display calendar day (Hanoi): days 1–7 → w1, …
    // Keeps monthly hubs light while entries stay deep-linkable on week pages.
    const week = weekOfMonth(displayDate);

    items.push({
      date,
      time,
      datetimeUtc,
      displayDate,
      // Month bucket for archive pages, aligned with day-separator grouping.
      month,
      week,
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

/** @param {string} displayDate YYYY-MM-DD */
export function weekOfMonth(displayDate) {
  const day = Number(displayDate.slice(8, 10));
  if (!Number.isFinite(day) || day < 1) return "w1";
  return `w${Math.ceil(day / 7)}`;
}

/** Calendar day range label for a week slug (w1 → 1–7, w5 → 29–31). */
export function weekDayRange(week) {
  const n = Number(String(week).replace(/^w/i, ""));
  if (!Number.isFinite(n) || n < 1) return { start: 1, end: 7 };
  const start = (n - 1) * 7 + 1;
  const end = Math.min(n * 7, 31);
  return { start, end };
}

// Unique months (YYYY-MM, newest first) that have at least one item.
export function getArchiveMonths(items = parsePulseLog()) {
  return [...new Set(items.map((item) => item.month))].sort((a, b) =>
    b.localeCompare(a),
  );
}

/** Weeks present in a month, newest first (w5 … w1). */
export function getArchiveWeeks(month, items = parsePulseLog()) {
  return [
    ...new Set(
      items.filter((item) => item.month === month).map((item) => item.week),
    ),
  ].sort((a, b) => b.localeCompare(a));
}

/** { month, week } pairs for getStaticPaths, newest months first. */
export function getArchiveMonthWeekPaths(items = parsePulseLog()) {
  const byMonth = new Map();
  for (const item of items) {
    let weeks = byMonth.get(item.month);
    if (!weeks) {
      weeks = new Set();
      byMonth.set(item.month, weeks);
    }
    weeks.add(item.week);
  }
  const months = [...byMonth.keys()].sort((a, b) => b.localeCompare(a));
  return months.flatMap((month) =>
    [...byMonth.get(month)]
      .sort((a, b) => b.localeCompare(a))
      .map((week) => ({ month, week })),
  );
}

/** Summary rows for a month hub: week slug, counts, day range from data. */
export function getMonthWeekSummaries(month, items = parsePulseLog()) {
  const inMonth = items.filter((item) => item.month === month);
  const weeks = getArchiveWeeks(month, inMonth);
  return weeks.map((week) => {
    const weekItems = inMonth.filter((item) => item.week === week);
    const days = weekItems.map((item) => Number(item.displayDate.slice(8, 10)));
    const { start: fallbackStart, end: fallbackEnd } = weekDayRange(week);
    return {
      week,
      count: weekItems.length,
      startDay: days.length ? Math.min(...days) : fallbackStart,
      endDay: days.length ? Math.max(...days) : fallbackEnd,
    };
  });
}

/** anchor → week map for redirecting legacy month#anchor links. */
export function getMonthAnchorWeekMap(month, items = parsePulseLog()) {
  const map = {};
  for (const item of items) {
    if (item.month === month) map[item.anchor] = item.week;
  }
  return map;
}

export function getCategories() {
  return Object.entries(CATEGORY_LABELS).map(([key, val]) => ({
    key,
    ...val,
  }));
}
