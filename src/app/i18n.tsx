import { i18n, type Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import {
  LANGUAGE_OPTIONS,
  type LanguageOption,
  type LocaleCode,
} from "@/app/preferences/preferences-schema";
import { useLocalePreference } from "@/app/preferences/preferences-store";
import { messages as enMessages } from "@/locales/en/messages.po";
import { messages as pseudoMessages } from "@/locales/pseudo/messages.po";
import { messages as zhHansMessages } from "@/locales/zh-Hans/messages.po";

const DEV_ONLY_LOCALE = "pseudo";
const IS_DEV = import.meta.env.DEV;

const DEFAULT_LOCALE: LocaleCode = "en";

const catalogs: Record<LocaleCode, Messages> = {
  en: enMessages,
  "zh-Hans": zhHansMessages,
  pseudo: pseudoMessages,
};

for (const localeKey of Object.keys(catalogs) as LocaleCode[]) {
  i18n.load(localeKey, catalogs[localeKey]);
}

i18n.activate(DEFAULT_LOCALE);

function normalizeLocale(input: string | null | undefined): LocaleCode {
  if (!input) {
    return DEFAULT_LOCALE;
  }

  if (input === DEV_ONLY_LOCALE && IS_DEV) {
    return DEV_ONLY_LOCALE;
  }

  if (input.startsWith("zh")) {
    return "zh-Hans";
  }

  if (input.startsWith("en")) {
    return "en";
  }

  return DEFAULT_LOCALE;
}

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  effectiveLocale: LocaleCode;
  isPseudoLocale: boolean;
  localeOptions: LanguageOption[];
  activeLocale: LanguageOption;
};

const I18nStateContext = createContext<I18nContextValue | null>(null);

type I18nStateProviderProps = {
  children: ReactNode;
};

export function I18nStateProvider({ children }: I18nStateProviderProps) {
  const { locale, setLocale } = useLocalePreference();

  const localeOptions = useMemo<LanguageOption[]>(() => {
    if (IS_DEV) {
      return [...LANGUAGE_OPTIONS];
    }

    return LANGUAGE_OPTIONS.filter((option) => !("devOnly" in option && option.devOnly));
  }, []);

  const effectiveLocale: LocaleCode =
    !IS_DEV && locale === DEV_ONLY_LOCALE ? DEFAULT_LOCALE : locale;

  const activeLocale =
    localeOptions.find((option) => option.key === effectiveLocale) ??
    localeOptions[0] ??
    LANGUAGE_OPTIONS[0];

  useEffect(() => {
    i18n.activate(effectiveLocale);
    document.documentElement.lang = effectiveLocale;
  }, [effectiveLocale]);

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocale(normalizeLocale(nextLocale));
      },
      effectiveLocale,
      isPseudoLocale: effectiveLocale === DEV_ONLY_LOCALE,
      localeOptions,
      activeLocale,
    }),
    [activeLocale, effectiveLocale, locale, localeOptions, setLocale],
  );

  return (
    <I18nProvider i18n={i18n}>
      <I18nStateContext.Provider value={contextValue}>{children}</I18nStateContext.Provider>
    </I18nProvider>
  );
}

export function useI18nState() {
  const context = useContext(I18nStateContext);

  if (!context) {
    throw new Error("useI18nState must be used within I18nStateProvider");
  }

  return context;
}
