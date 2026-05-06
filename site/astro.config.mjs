// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://claude-pulse.chatbot.tw",
  trailingSlash: "always",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-TW", "zh-CN", "ja", "ko"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "en",
        locales: {
          en: "en",
          "zh-TW": "zh-TW",
          "zh-CN": "zh-CN",
          ja: "ja",
          ko: "ko",
        },
      },
    }),
  ],
});
