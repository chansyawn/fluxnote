import type { LocaleCode } from "@shared/features/preferences/user-preferences";

type TrayMenuLabelKey = "devTools" | "quit" | "show";

const fallbackLocale: Exclude<LocaleCode, "pseudo"> = "en";

const trayMenuLabels: Record<Exclude<LocaleCode, "pseudo">, Record<TrayMenuLabelKey, string>> = {
  en: {
    devTools: "Open DevTools",
    quit: "Quit",
    show: "Show Fluxnotes",
  },
  "zh-Hans": {
    devTools: "打开开发者工具",
    quit: "退出",
    show: "打开 Fluxnotes",
  },
};

function normalizeTrayLocale(locale: LocaleCode): Exclude<LocaleCode, "pseudo"> {
  if (locale === "pseudo") {
    return fallbackLocale;
  }

  return locale;
}

export function getTrayMenuLabel(locale: LocaleCode, key: TrayMenuLabelKey): string {
  return trayMenuLabels[normalizeTrayLocale(locale)][key];
}
