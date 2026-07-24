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
//
// Also gates deploy on IndexNow key file bytes (no trailing newline — Bing
// 403 UserForbiddedToAccessSite since 07-16) and full i18n summary coverage
// for every log row across en/ja/ko/zh-CN.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_LOG = join(__dirname, "..", "..", "claude_pulse_log.md");
// Optional path argument so the rules can be exercised against a fixture.
const logPath = process.argv[2] ?? DEFAULT_LOG;
const isDefaultLog = logPath === DEFAULT_LOG;

const INDEXNOW_KEY =
  "59bb71005eaf7c07a88ea5d15647955ef8663627ce8f0243e70de1af5ab07a07";
const INDEXNOW_KEY_PATH = join(
  __dirname,
  "..",
  "public",
  `${INDEXNOW_KEY}.txt`,
);

const SUMMARY_LOCALES = [
  { code: "en", file: "summaries-en.json" },
  { code: "ja", file: "summaries-ja.json" },
  { code: "ko", file: "summaries-ko.json" },
  { code: "zh-CN", file: "summaries-zh-CN.json" },
];

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

function splitRow(line) {
  const parts = line.split(/(?<!\\)\|/).map((cell) => cell.trim());
  if (
    parts.length !== 8 ||
    parts[0] !== "" ||
    parts[parts.length - 1] !== ""
  ) {
    return null;
  }
  return parts
    .slice(1, 7)
    .map((cell) => cell.replaceAll("\\|", "|"));
}

function validateRow(line, lineNo, errors) {
  const err = (msg) => errors.push(`line ${lineNo}: ${msg}`);

  const cells = splitRow(line);
  if (!cells) {
    const parts = line.split(/(?<!\\)\|/);
    err(
      `expected 6 cells (date|time|category|summary|source|url), got ${parts.length - 2} — ` +
        `literal "|" inside a cell must be escaped as "\\|"`,
    );
    return null;
  }

  const [date, time, category, summary, source, url] = cells;

  if (!DATE_RE.test(date) || isNaN(Date.parse(date))) {
    err(`invalid date "${date}"`);
  } else if (date > maxDate) {
    err(`future date "${date}" — log is retrospective, date must be ≤ today`);
  }

  if (!TIME_RE.test(time)) err(`invalid time "${time}" (expected HH:MM UTC)`);

  if (!CATEGORIES.has(category)) {
    err(
      `unknown category "${category}" (expected one of: ${[...CATEGORIES].join(", ")})`,
    );
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

  return { date, category, source };
}

// Bing rejects a key file with trailing newline (403 UserForbiddedToAccessSite).
// Must be exact key bytes — editors that insert final newline re-break this.
function validateIndexNowKey(errors) {
  let buf;
  try {
    buf = readFileSync(INDEXNOW_KEY_PATH);
  } catch {
    errors.push(`IndexNow key file missing: ${INDEXNOW_KEY_PATH}`);
    return;
  }

  const expected = Buffer.from(INDEXNOW_KEY, "utf8");
  if (buf.length !== expected.length || !buf.equals(expected)) {
    errors.push(
      `IndexNow key file must be exactly ${expected.length} bytes with no trailing newline ` +
        `(got ${buf.length} bytes at ${INDEXNOW_KEY_PATH}). ` +
        `Bing rejects trailing newline with 403 UserForbiddedToAccessSite.`,
    );
  }
}

// Mirrors parse-pulse.js lookupKey: date|category|source with #N for duplicates
// in file order. Missing/empty translation used to silently fall back to zh-TW.
function validateI18nCoverage(rows, errors) {
  const dicts = {};
  for (const { code, file } of SUMMARY_LOCALES) {
    const path = join(__dirname, "..", "src", "i18n", file);
    try {
      dicts[code] = JSON.parse(readFileSync(path, "utf-8"));
    } catch (err) {
      errors.push(`i18n: cannot load ${file}: ${err.message}`);
      return;
    }
  }

  const keyCounts = {};
  let missing = 0;

  for (const { date, category, source } of rows) {
    const baseKey = `${date}|${category}|${source}`;
    keyCounts[baseKey] = (keyCounts[baseKey] || 0) + 1;
    const lookupKey =
      keyCounts[baseKey] === 1 ? baseKey : `${baseKey}#${keyCounts[baseKey]}`;

    for (const { code } of SUMMARY_LOCALES) {
      const value = dicts[code][lookupKey];
      if (typeof value !== "string" || value.trim() === "") {
        missing++;
        if (missing <= 20) {
          errors.push(`i18n: missing or empty ${code} summary for "${lookupKey}"`);
        }
      }
    }
  }

  if (missing > 20) {
    errors.push(`i18n: …and ${missing - 20} more missing/empty summary field(s)`);
  }
}

function main() {
  const lines = readFileSync(logPath, "utf-8").split("\n");
  const errors = [];
  const rows = [];

  lines.forEach((line, i) => {
    if (!isTableRow(line)) return;
    const parsed = validateRow(line, i + 1, errors);
    if (parsed) rows.push(parsed);
  });

  if (rows.length === 0) errors.push("no table rows found — wrong file?");

  // Always gate the IndexNow key (independent of which log path is under test).
  validateIndexNowKey(errors);

  // i18n only for the real log — fixtures intentionally lack translations.
  if (isDefaultLog) validateI18nCoverage(rows, errors);

  if (errors.length > 0) {
    console.error(`✗ ${logPath}: ${errors.length} problem(s)`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(
    `✓ ${rows.length} log rows valid; IndexNow key ok; i18n coverage ok`,
  );
}

main();
