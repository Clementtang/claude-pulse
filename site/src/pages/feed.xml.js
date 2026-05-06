import rss from "@astrojs/rss";
import { parsePulseLog } from "../lib/parse-pulse.js";

export function GET(context) {
  const items = parsePulseLog();

  return rss({
    title: "Claude Pulse",
    description: "Anthropic / Claude 動態追蹤",
    site: context.site,
    items: items.map((item, i) => ({
      title: `[${item.categoryLabel}] ${item.summary.slice(0, 80)}`,
      description: item.summary,
      pubDate: new Date(item.date + "T08:00:00+07:00"),
      categories: [item.category],
      link: `${context.site}#${item.date}-${item.category}-${i}`,
    })),
    customData: "<language>zh-Hant</language>",
  });
}
