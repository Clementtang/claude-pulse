// @ts-check
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://clementtang.github.io",
  base: "/claude-pulse",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "zh-TW", "zh-HK", "zh-CN", "ja", "ko"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
