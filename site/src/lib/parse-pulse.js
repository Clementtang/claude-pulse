import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CATEGORY_LABELS = {
  "claude-code": { label: "Claude Code", color: "#3b82f6" },
  platform: { label: "Platform", color: "#10b981" },
  research: { label: "Research", color: "#8b5cf6" },
  industry: { label: "Industry", color: "#f59e0b" },
  enterprise: { label: "Enterprise", color: "#ef4444" },
};

export function parsePulseLog() {
  const logPath = resolve(process.cwd(), "..", "claude_pulse_log.md");
  const content = readFileSync(logPath, "utf-8");

  const lines = content.split("\n");
  const items = [];

  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (line.includes("---")) continue;
    if (line.includes("| date")) continue;

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    if (cells.length < 4) continue;

    const [date, category, summary, source] = cells;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const meta = CATEGORY_LABELS[category] || {
      label: category,
      color: "#6b7280",
    };

    items.push({
      date,
      category,
      categoryLabel: meta.label,
      categoryColor: meta.color,
      summary,
      source,
    });
  }

  return items;
}

export function getCategories() {
  return Object.entries(CATEGORY_LABELS).map(([key, val]) => ({
    key,
    ...val,
  }));
}
