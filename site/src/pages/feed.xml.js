import rss from "@astrojs/rss";
import { parsePulseLog } from "../lib/parse-pulse.js";

// Feed conventions: newest 50 items only (the full history lives on the
// archive pages), real UTC timestamps from the log's time column, and links
// that deep-link to each entry's stable archive anchor. @astrojs/rss emits
// <guid isPermaLink="true">{link}</guid>, so a stable link doubles as a
// stable guid — items no longer re-surface as unread when the log grows.
const FEED_ITEM_LIMIT = 50;

export function GET(context) {
  const items = parsePulseLog().slice(0, FEED_ITEM_LIMIT);

  return rss({
    title: "Claude Pulse",
    description: "Anthropic / Claude 動態追蹤",
    site: context.site,
    items: items.map((item) => ({
      title: `[${item.categoryLabel}] ${item.summary.slice(0, 80)}`,
      description: item.summary,
      pubDate: new Date(item.datetimeUtc),
      categories: [item.category],
      link: `${context.site}zh-TW/archive/${item.month}/#${item.anchor}`,
    })),
    customData: "<language>zh-Hant</language>",
  });
}
