import { defineConfig } from "@lingui/cli";

type CatalogConfig = {
  path: string;
  include: string[];
  exclude?: string[];
};

type LinguiConfigOptions = {
  catalogs: CatalogConfig[];
};

export const PSEUDO_LOCALE = "pseudo";
export const LINGUI_LOCALES = ["en", "zh-Hans", PSEUDO_LOCALE] as const;

export function createLinguiConfig({ catalogs }: LinguiConfigOptions) {
  return defineConfig({
    sourceLocale: "en",
    locales: [...LINGUI_LOCALES],
    pseudoLocale: PSEUDO_LOCALE,
    fallbackLocales: { default: "en" },
    catalogs,
    compileNamespace: "ts",
    orderBy: "messageId",
  });
}
