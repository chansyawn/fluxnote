// @vitest-environment jsdom

import { queryClient } from "@renderer/app/query";
import { DEFAULT_SETTINGS, type Settings } from "@shared/features/preferences/settings";
import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  onPreferencesChanged: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  onPreferencesChanged: clientMocks.onPreferencesChanged,
  patchSettings: vi.fn(),
  readSettings: vi.fn(),
  resetSettings: vi.fn(),
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

import { PreferencesSync, SETTINGS_QUERY_KEY } from "./preferences-query";

function renderPreferencesSync() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <PreferencesSync />
      </QueryClientProvider>,
    );
  });

  return {
    unmount(): void {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("PreferencesSync", () => {
  let mountedRoot: { unmount: () => void } | null = null;

  afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    queryClient.clear();
    clientMocks.onPreferencesChanged.mockReset();
  });

  it("updates settings query cache from preferences changed event", () => {
    let handler: ((settings: Settings) => void) | null = null;
    const unlisten = vi.fn();
    clientMocks.onPreferencesChanged.mockImplementation((nextHandler) => {
      handler = nextHandler;
      return unlisten;
    });
    mountedRoot = renderPreferencesSync();
    const nextSettings: Settings = {
      ...DEFAULT_SETTINGS,
      appearance: { ...DEFAULT_SETTINGS.appearance, locale: "zh-Hans" },
    };

    act(() => {
      handler?.(nextSettings);
    });

    expect(queryClient.getQueryData(SETTINGS_QUERY_KEY)).toEqual(nextSettings);
  });
});
