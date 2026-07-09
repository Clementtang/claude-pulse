// Build-time validation for claude_pulse_log.md (v2 schema).
//
// Runs before `astro build` (see package.json). A malformed row fails the
// build so corrupted data never deploys — unescaped "|" inside a summary
// silently shifts columns and has shipped broken links before (2026-05-07
// v2.1.133 row rendered a relative /github.com link on all 5 locales).
//
// Rules per row: exactly 6 cells (date | time | category | summary | source
// | url), valid date not in the future, HH:MM time, known category, bare
// domain source, https URL whose host matches the source domain.
// Literal "|" inside a cell must be escaped as "\|".

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Optional path argument so the rules can be exercised against a fixture.
const logPath =
  process.argv[2] ?? join(__dirname, "..", "..", "claude_pulse_log.md");

const CATEGORIES = new Set([
  "claude-code",
  "platform",
  "research",
  "industry",
  "enterprise",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SOURCE_RE = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

// Curator writes from UTC+7; allow one day of slack so a fresh entry never
// fails a build running just behind Hanoi's calendar date.
const maxDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

function isTableRow(line) {
  if (!line.startsWith("|")) return false;
  if (/^\|[\s|:-]+$/.test(line)) return false; // separator row
  if (line.includes("| date")) return false; // header row
  return true;
}

function validateRow(line, lineNo, errors) {
  const err = (msg) => errors.push(`line ${lineNo}: ${msg}`);

  // Split on unescaped pipes only, mirroring parse-pulse.js.
  const parts = line.split(/(?<!\\)\|/).map((cell) => cell.trim());
  // A well-formed row is |c1|...|c6| → leading + trailing empty parts.
  if (
    parts.length !== 8 ||
    parts[0] !== "" ||
    parts[parts.length - 1] !== ""
  ) {
    err(
      `expected 6 cells (date|time|category|summary|source|url), got ${parts.length - 2} — ` +
        `literal "|" inside a cell must be escaped as "\\|"`,
    );
    return;
  }

  const [date, time, category, summary, source, url] = parts
    .slice(1, 7)
    .map((cell) => cell.replaceAll("\\|", "|"));

  if (!DATE_RE.test(date) || isNaN(Date.parse(date))) {
    err(`invalid date "${date}"`);
  } else if (date > maxDate) {
    err(`future date "${date}" — log is retrospective, date must be ≤ today`);
  }

  if (!TIME_RE.test(time)) err(`invalid time "${time}" (expected HH:MM UTC)`);

  if (!CATEGORIES.has(category)) {
    err(`unknown category "${category}" (expected one of: ${[...CATEGORIES].join(", ")})`);
  }

  if (!summary) err("empty summary");

  if (!SOURCE_RE.test(source)) {
    err(`invalid source "${source}" (expected bare domain like "github.com")`);
  }

  if (!/^https:\/\/\S+$/.test(url)) {
    err(`invalid url "${url}" (must be a full https:// URL)`);
  } else if (SOURCE_RE.test(source)) {
    const host = new URL(url).hostname;
    if (host !== source && !host.endsWith(`.${source}`)) {
      err(`url host "${host}" does not match source "${source}"`);
    }
  }
}

function main() {
  const lines = readFileSync(logPath, "utf-8").split("\n");
  const errors = [];
  let rows = 0;

  lines.forEach((line, i) => {
    if (!isTableRow(line)) return;
    rows++;
    validateRow(line, i + 1, errors);
  });

  if (rows === 0) errors.push("no table rows found — wrong file?");

  if (errors.length > 0) {
    console.error(`✗ ${logPath}: ${errors.length} problem(s)`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`✓ ${rows} log rows valid`);
}

main();
