// @vitest-environment jsdom

import { createRendererSettings } from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import type { Settings } from "@shared/features/preferences/settings";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  onPreferencesChanged: vi.fn(),
  patchSettings: vi.fn(),
  readSettings: vi.fn(),
  resetSettings: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  onPreferencesChanged: clientMocks.onPreferencesChanged,
  patchSettings: clientMocks.patchSettings,
  readSettings: clientMocks.readSettings,
  resetSettings: clientMocks.resetSettings,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

import { PreferencesSync, SETTINGS_QUERY_KEY } from "./preferences-query";

describe("PreferencesSync", () => {
  afterEach(() => {
    clientMocks.onPreferencesChanged.mockReset();
    clientMocks.patchSettings.mockReset();
    clientMocks.readSettings.mockReset();
    clientMocks.resetSettings.mockReset();
  });

  it("keeps the User Preferences query cache in sync with renderer events", () => {
    let preferencesChanged: (settings: Settings) => void = (_settings) => {
      throw new Error("Preferences changed listener was not registered.");
    };
    const unlisten = vi.fn();
    clientMocks.onPreferencesChanged.mockImplementation((handler: (settings: Settings) => void) => {
      preferencesChanged = handler;
      return unlisten;
    });
    const nextSettings = createRendererSettings({ appearance: { locale: "zh-Hans" } });
    const { queryClient, unmount } = renderWithProviders(<PreferencesSync />);

    preferencesChanged(nextSettings);

    expect(queryClient.getQueryData(SETTINGS_QUERY_KEY)).toEqual(nextSettings);

    unmount();

    expect(unlisten).toHaveBeenCalledOnce();
  });
});
