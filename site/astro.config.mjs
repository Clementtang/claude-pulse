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
  // Keep page scripts as hashed /_astro/*.js files. Vite's default 4 KB
  // inline limit was folding home-client into every locale HTML (~4 KB × 5).
  vite: {
    build: {
      assetsInlineLimit: 0,
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
