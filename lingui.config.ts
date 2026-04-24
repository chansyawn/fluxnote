import { defineConfig } from "@lingui/cli";

const PSEUDO_LOCALE = "pseudo";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "zh-Hans", PSEUDO_LOCALE],
  pseudoLocale: PSEUDO_LOCALE,
  fallbackLocales: { default: "en" },
  catalogs: [
    {
      path: "<rootDir>/src/renderer/locales/{locale}/messages",
      include: ["src/renderer"],
    },
  ],
  compileNamespace: "ts",
  orderBy: "messageId",
});
