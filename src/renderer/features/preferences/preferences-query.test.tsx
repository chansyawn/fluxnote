// @vitest-environment jsdom

import { createRendererUserPreferences } from "@renderer/test/fixtures";
import { renderWithProviders } from "@renderer/test/render";
import type { UserPreferences } from "@shared/features/preferences/user-preferences";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  onPreferencesChanged: vi.fn(),
  patchUserPreferences: vi.fn(),
  readUserPreferences: vi.fn(),
  resetUserPreferences: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  onPreferencesChanged: clientMocks.onPreferencesChanged,
  patchUserPreferences: clientMocks.patchUserPreferences,
  readUserPreferences: clientMocks.readUserPreferences,
  resetUserPreferences: clientMocks.resetUserPreferences,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

import { PreferencesSync, USER_PREFERENCES_QUERY_KEY } from "./preferences-query";

describe("PreferencesSync", () => {
  afterEach(() => {
    clientMocks.onPreferencesChanged.mockReset();
    clientMocks.patchUserPreferences.mockReset();
    clientMocks.readUserPreferences.mockReset();
    clientMocks.resetUserPreferences.mockReset();
  });

  it("keeps the User Preferences query cache in sync with renderer events", () => {
    let preferencesChanged: (preferences: UserPreferences) => void = (_settings) => {
      throw new Error("Preferences changed listener was not registered.");
    };
    const unlisten = vi.fn();
    clientMocks.onPreferencesChanged.mockImplementation(
      (handler: (preferences: UserPreferences) => void) => {
        preferencesChanged = handler;
        return unlisten;
      },
    );
    const nextPreferences = createRendererUserPreferences({ appearance: { locale: "zh-Hans" } });
    const { queryClient, unmount } = renderWithProviders(<PreferencesSync />);

    preferencesChanged(nextPreferences);

    expect(queryClient.getQueryData(USER_PREFERENCES_QUERY_KEY)).toEqual(nextPreferences);

    unmount();

    expect(unlisten).toHaveBeenCalledOnce();
  });
});
