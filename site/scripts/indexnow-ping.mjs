// Notify IndexNow-participating search engines (Bing, Naver, Seznam, Yandex…)
// that the site's URLs changed. Runs in GH Actions after `npm run build`
// (needs dist/sitemap-0.xml) and must never block the deploy — the workflow
// step uses continue-on-error, and this script exits 0 on API errors too.
//
// The key is intentionally public: the protocol verifies ownership by
// fetching https://<host>/<key>.txt (see site/public/<key>.txt).
//
// Usage: node scripts/indexnow-ping.mjs [--dry-run]

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOST = "claude-pulse.chatbot.tw";
const KEY = "59bb71005eaf7c07a88ea5d15647955ef8663627ce8f0243e70de1af5ab07a07";
const ENDPOINT = "https://api.indexnow.org/indexnow";

const dryRun = process.argv.includes("--dry-run");

const sitemap = readFileSync(
  join(__dirname, "..", "dist", "sitemap-0.xml"),
  "utf-8",
);
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

if (urls.length === 0) {
  console.error("✗ no <loc> entries found in dist/sitemap-0.xml");
  process.exit(1);
}

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls,
};

if (dryRun) {
  console.log(`dry-run: would submit ${urls.length} URLs to ${ENDPOINT}`);
  console.log(urls.join("\n"));
  process.exit(0);
}

try {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  // 200 = OK, 202 = accepted (key validation pending) — both are success.
  if (res.status === 200 || res.status === 202) {
    console.log(`✓ IndexNow accepted ${urls.length} URLs (HTTP ${res.status})`);
  } else {
    console.error(`✗ IndexNow returned HTTP ${res.status}: ${await res.text()}`);
  }
} catch (err) {
  console.error(`✗ IndexNow ping failed: ${err.message}`);
}
