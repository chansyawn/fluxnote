import { i18n, type Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

export function activateTestI18n(messages: Messages = {}): typeof i18n {
  i18n.load("en", messages);
  i18n.activate("en");
  return i18n;
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const testI18n = activateTestI18n();

  function Providers({ children }: { children: ReactNode }) {
    return (
      <I18nProvider i18n={testI18n}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, {
      ...options,
      wrapper: Providers,
    }),
  };
}
