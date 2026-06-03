import { i18n, type Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function activateTestI18n(messages: Messages = {}): typeof i18n {
  i18n.load("en", messages);
  i18n.activate("en");
  return i18n;
}

export function renderWithProviders(
  ui: ReactElement,
  options: Omit<RenderOptions, "wrapper"> = {},
) {
  const testI18n = activateTestI18n();

  function Providers({ children }: { children: ReactNode }) {
    return <I18nProvider i18n={testI18n}>{children}</I18nProvider>;
  }

  return render(ui, {
    ...options,
    wrapper: Providers,
  });
}
