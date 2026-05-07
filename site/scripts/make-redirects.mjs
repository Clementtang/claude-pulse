// Replace site/dist with redirect-only content for GH Pages.
//
// CF Pages serves the real site at https://claude-pulse.chatbot.tw/.
// GH Pages (clementtang.github.io/claude-pulse/) becomes a redirect shell
// pointing browsers + Google to the new domain.
//
// This script runs in GH Actions only (after `npm run build`); CF Pages
// does not run this script — its build pipeline pulls fresh from git and
// stops at `npm run build`.

import { readFile, writeFile, rm, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const newOrigin = "https://claude-pulse.chatbot.tw";

const LOCALES = ["", "zh-TW", "zh-CN", "ja", "ko"]; // "" = root (en)

// For HTTP 200 pages (known old paths: /, /zh-TW/, /zh-CN/, /ja/, /ko/).
// Includes <link rel="canonical"> to signal Google to transfer indexing
// to the new URL. Does NOT include noindex — that would tell Google to drop
// the URL entirely, defeating the purpose of canonical.
function redirectHTML(targetPath) {
  const target = `${newOrigin}${targetPath}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Claude Pulse — Moved</title>
<meta http-equiv="refresh" content="0; url=${target}">
<link rel="canonical" href="${target}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;max-width:40em;margin:4em auto;padding:0 1em;line-height:1.6;color:#1a1a1b;background:#faf9f0}a{color:#d97757}</style>
</head>
<body>
<h1>Claude Pulse has moved</h1>
<p>This site is now at <a href="${target}">${target}</a>. You will be redirected automatically.</p>
<p>If your browser does not redirect, please update your bookmark.</p>
</body>
</html>
`;
}

// For 404.html (HTTP 404 status served by GH Pages on unknown paths).
// Does NOT include canonical — 404 means "page doesn't exist", which
// contradicts canonical's "this URL is an alias for that URL".
// Includes noindex to keep the 404 page itself out of search results.
// meta refresh is purely for user UX so visitors land on the new home.
function notFoundHTML() {
  const target = `${newOrigin}/`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Claude Pulse — Page not found</title>
<meta http-equiv="refresh" content="3; url=${target}">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;max-width:40em;margin:4em auto;padding:0 1em;line-height:1.6;color:#1a1a1b;background:#faf9f0}a{color:#d97757}</style>
</head>
<body>
<h1>Page not found</h1>
<p>Claude Pulse has moved to <a href="${target}">${target}</a>. The path you requested doesn't exist on the new site either.</p>
<p>You will be redirected to the new home in 3 seconds.</p>
</body>
</html>
`;
}

function feedXML() {
  const newFeedURL = `${newOrigin}/feed.xml`;
  const pubDate = new Date().toUTCString();
  // Reuse the GUID format used by the Astro RSS feed so subscribers
  // don't see this notice as a duplicate of any historical item.
  const guid = `${newOrigin}/migration-notice`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Claude Pulse — Moved</title>
  <description>Claude Pulse has moved to https://claude-pulse.chatbot.tw/</description>
  <link>${newOrigin}/</link>
  <language>zh-Hant</language>
  <lastBuildDate>${pubDate}</lastBuildDate>
  <item>
    <title>📢 Claude Pulse 已搬家 — 請更新 RSS 訂閱來源</title>
    <description>本 RSS feed 已搬遷至 ${newFeedURL}。請將訂閱來源更新為新網址，否則將不會收到後續 Anthropic / Claude 動態。Claude Pulse has moved to a new home at ${newOrigin}/. Please update your RSS subscription URL to ${newFeedURL} to keep receiving updates.</description>
    <link>${newFeedURL}</link>
    <guid isPermaLink="false">${guid}</guid>
    <pubDate>${pubDate}</pubDate>
  </item>
</channel>
</rss>
`;
}

async function emptyDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir)) {
    await rm(join(dir, entry), { recursive: true, force: true });
  }
}

async function main() {
  if (!existsSync(distDir)) {
    throw new Error(`dist/ not found at ${distDir} — run 'npm run build' first`);
  }

  // Wipe everything CF Pages built; we replace with bare redirect shells.
  await emptyDir(distDir);

  // Per-locale redirect pages
  for (const locale of LOCALES) {
    const subdir = locale ? join(distDir, locale) : distDir;
    if (locale) await mkdir(subdir, { recursive: true });
    const targetPath = locale ? `/${locale}/` : "/";
    await writeFile(join(subdir, "index.html"), redirectHTML(targetPath));
  }

  // Catch-all 404 — served as HTTP 404 by GH Pages.
  // Different template (no canonical, has noindex, 3s refresh for UX).
  await writeFile(join(distDir, "404.html"), notFoundHTML());

  // RSS feed: keep file alive with a "moved" notice item
  await writeFile(join(distDir, "feed.xml"), feedXML());

  console.log(`✓ dist/ replaced with redirect shells (${LOCALES.length} locales + 404 + feed.xml)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
