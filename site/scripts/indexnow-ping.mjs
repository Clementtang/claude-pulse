// Notify IndexNow-participating search engines (Bing, Naver, Seznam, Yandex…)
// that the site's URLs changed. Runs in GH Actions after `npm run build`
// (needs dist/sitemap-0.xml) and must never block the deploy — the workflow
// step uses continue-on-error, and this script exits 0 on API errors too.
//
// The key is intentionally public: the protocol verifies ownership by
// fetching https://<host>/<key>.txt (see site/public/<key>.txt).
//
// Key file must be exact 64 hex bytes with no trailing newline — Bing
// rejects trailing newline (403 UserForbiddedToAccessSite). validate-log.mjs
// also asserts this at build time; we re-check here before POST.
//
// Submits to both api.indexnow.org and www.bing.com/indexnow so a 202 from
// the hub cannot mask a Bing ownership failure (seen 2026-07-16..23).
// Failures write to GITHUB_STEP_SUMMARY when available.
//
// Usage: node scripts/indexnow-ping.mjs [--dry-run]

import { appendFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOST = "claude-pulse.chatbot.tw";
const KEY = "59bb71005eaf7c07a88ea5d15647955ef8663627ce8f0243e70de1af5ab07a07";
const KEY_PATH = join(__dirname, "..", "public", `${KEY}.txt`);
const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

const dryRun = process.argv.includes("--dry-run");

function writeStepSummary(markdown) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  try {
    appendFileSync(path, `${markdown}\n`);
  } catch (err) {
    console.error(`could not write GITHUB_STEP_SUMMARY: ${err.message}`);
  }
}

function assertKeyFile() {
  let buf;
  try {
    buf = readFileSync(KEY_PATH);
  } catch {
    const msg = `IndexNow key file missing: ${KEY_PATH}`;
    console.error(`✗ ${msg}`);
    writeStepSummary(`## IndexNow\n\n**Failed:** ${msg}\n`);
    process.exit(1);
  }

  const expected = Buffer.from(KEY, "utf8");
  if (buf.length !== expected.length || !buf.equals(expected)) {
    const msg =
      `IndexNow key file must be exactly ${expected.length} bytes with no trailing newline ` +
      `(got ${buf.length} bytes). Bing rejects trailing newline with 403.`;
    console.error(`✗ ${msg}`);
    writeStepSummary(`## IndexNow\n\n**Failed:** ${msg}\n`);
    process.exit(1);
  }
}

async function submit(endpoint, payload) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    // 200 = OK, 202 = accepted (key validation pending) — both are success.
    const ok = res.status === 200 || res.status === 202;
    return { endpoint, status: res.status, ok, body: body.slice(0, 500) };
  } catch (err) {
    return {
      endpoint,
      status: 0,
      ok: false,
      body: err.message,
    };
  }
}

assertKeyFile();

const sitemap = readFileSync(
  join(__dirname, "..", "dist", "sitemap-0.xml"),
  "utf-8",
);
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (urls.length === 0) {
  console.error("✗ no <loc> entries found in dist/sitemap-0.xml");
  writeStepSummary(
    "## IndexNow\n\n**Failed:** no `<loc>` entries in dist/sitemap-0.xml\n",
  );
  process.exit(1);
}

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls,
};

if (dryRun) {
  console.log(
    `dry-run: would submit ${urls.length} URLs to ${ENDPOINTS.join(", ")}`,
  );
  console.log(urls.join("\n"));
  process.exit(0);
}

const results = [];
for (const endpoint of ENDPOINTS) {
  results.push(await submit(endpoint, payload));
}

const lines = [
  `## IndexNow`,
  ``,
  `Submitted **${urls.length}** URLs for \`${HOST}\`.`,
  ``,
  `| Endpoint | HTTP | Result |`,
  `| --- | --- | --- |`,
];

let anyFail = false;
for (const r of results) {
  const label = r.ok ? "ok" : "FAIL";
  if (!r.ok) anyFail = true;
  const short = r.endpoint.replace(/^https:\/\//, "");
  lines.push(`| \`${short}\` | ${r.status || "err"} | ${label} |`);
  if (r.ok) {
    console.log(`✓ IndexNow ${short} accepted ${urls.length} URLs (HTTP ${r.status})`);
  } else {
    console.error(
      `✗ IndexNow ${short} failed (HTTP ${r.status || "n/a"}): ${r.body}`,
    );
  }
}

if (anyFail) {
  lines.push(``);
  lines.push(
    `> At least one endpoint failed. Deploy continues (continue-on-error), but IndexNow may be broken — check key ownership and Bing response body.`,
  );
  for (const r of results.filter((x) => !x.ok)) {
    lines.push(``);
    lines.push(`**${r.endpoint}**`);
    lines.push("```");
    lines.push(r.body || "(empty body)");
    lines.push("```");
  }
}

writeStepSummary(lines.join("\n"));
// Exit 0 on API failures so deploy is not blocked; key/sitemap errors already exited 1.
process.exit(0);
