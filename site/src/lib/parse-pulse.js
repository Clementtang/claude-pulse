import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import summariesEn from "../i18n/summaries-en.json" with { type: "json" };

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

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
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

    // Look up English summary with #N suffix for duplicate keys
    const baseKey = `${date}|${category}|${source}`;
    keyCounts[baseKey] = (keyCounts[baseKey] || 0) + 1;
    const enKey =
      keyCounts[baseKey] === 1 ? baseKey : `${baseKey}#${keyCounts[baseKey]}`;
    const summaryEn = summariesEn[enKey] || summary;

    items.push({
      date,
      time,
      datetimeUtc,
      category,
      categoryLabel: meta.label,
      categoryColor: meta.color,
      categoryBg: meta.bg,
      summary,
      summaryEn,
      source,
      url,
    });
  }

  // Sort by datetime descending (newest first)
  items.sort((a, b) => b.datetimeUtc.localeCompare(a.datetimeUtc));

  return items;
}

export function getCategories() {
  return Object.entries(CATEGORY_LABELS).map(([key, val]) => ({
    key,
    ...val,
  }));
}
