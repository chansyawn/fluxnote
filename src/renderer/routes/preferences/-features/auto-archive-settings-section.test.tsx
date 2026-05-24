// @vitest-environment jsdom

import { SETTINGS_QUERY_KEY } from "@renderer/features/preferences/preferences-query";
import { createRendererSettings } from "@renderer/test/fixtures";
import { createTestQueryClient, renderWithProviders } from "@renderer/test/render";
import type { Settings, SettingsPatch } from "@shared/features/preferences/settings";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  deleteArchivedBlocks: vi.fn(),
  onPreferencesChanged: vi.fn(),
  patchSettings: vi.fn(),
  readSettings: vi.fn(),
  resetSettings: vi.fn(),
}));

const blockQueryMocks = vi.hoisted(() => ({
  refreshBlocks: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  deleteArchivedBlocks: clientMocks.deleteArchivedBlocks,
  onPreferencesChanged: clientMocks.onPreferencesChanged,
  patchSettings: clientMocks.patchSettings,
  readSettings: clientMocks.readSettings,
  resetSettings: clientMocks.resetSettings,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("@renderer/features/blocks/block-query", () => ({
  refreshBlocks: blockQueryMocks.refreshBlocks,
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: { children?: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { AutoArchiveSettingsSection } from "./auto-archive-settings-section";

function setupUserPreferences(initialSettings: Settings): Settings {
  let settings = initialSettings;
  clientMocks.readSettings.mockImplementation(async () => settings);
  clientMocks.patchSettings.mockImplementation(async (patch: SettingsPatch) => {
    settings = createRendererSettings({
      ...settings,
      ...patch,
      appearance: { ...settings.appearance, ...patch.appearance },
      autoArchive: { ...settings.autoArchive, ...patch.autoArchive },
      markdown: {
        ...settings.markdown,
        ...patch.markdown,
        codeBlock: {
          ...settings.markdown.codeBlock,
          ...patch.markdown?.codeBlock,
        },
      },
      shortcuts: { ...settings.shortcuts, ...patch.shortcuts },
      telemetry: { ...settings.telemetry, ...patch.telemetry },
    });
    return settings;
  });
  return settings;
}

function renderAutoArchiveSettings(initialSettings: Settings) {
  const settings = setupUserPreferences(initialSettings);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(SETTINGS_QUERY_KEY, settings);

  return renderWithProviders(<AutoArchiveSettingsSection />, { queryClient });
}

function lastSettingsPatch(): SettingsPatch {
  const patch = clientMocks.patchSettings.mock.calls.at(-1)?.[0];
  if (!patch) {
    throw new Error("Expected User Preferences to be patched.");
  }
  return patch;
}

describe("AutoArchiveSettingsSection", () => {
  beforeEach(() => {
    clientMocks.deleteArchivedBlocks.mockResolvedValue({ deletedCount: 0 });
    clientMocks.onPreferencesChanged.mockReturnValue(() => undefined);
  });

  afterEach(() => {
    clientMocks.deleteArchivedBlocks.mockReset();
    clientMocks.onPreferencesChanged.mockReset();
    clientMocks.patchSettings.mockReset();
    clientMocks.readSettings.mockReset();
    clientMocks.resetSettings.mockReset();
    blockQueryMocks.refreshBlocks.mockReset();
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
  });

  it("shows the Auto Archive duration in canonical units", () => {
    renderAutoArchiveSettings(createRendererSettings({ autoArchive: { idleMinutes: 60 } }));

    expect(screen.getByRole("textbox", { name: "Auto archive duration amount" })).toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "Auto archive duration unit" })).toHaveTextContent(
      "hours",
    );
  });

  it("saves Auto Archive duration when the user leaves the amount field", async () => {
    const user = userEvent.setup();
    renderAutoArchiveSettings(createRendererSettings({ autoArchive: { idleMinutes: 125 } }));
    const amountInput = screen.getByRole("textbox", { name: "Auto archive duration amount" });

    await user.clear(amountInput);
    await user.type(amountInput, "60");

    expect(clientMocks.patchSettings).not.toHaveBeenCalled();

    await user.tab();

    await waitFor(() => {
      expect(lastSettingsPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 60 },
      });
    });
    expect(amountInput).toHaveValue("60");
  });

  it("rejects non-digit Auto Archive duration edits", async () => {
    const user = userEvent.setup();
    renderAutoArchiveSettings(createRendererSettings({ autoArchive: { idleMinutes: 125 } }));
    const amountInput = screen.getByRole("textbox", { name: "Auto archive duration amount" });

    await user.click(amountInput);
    await user.keyboard("a");

    expect(amountInput).toHaveValue("125");
    expect(clientMocks.patchSettings).not.toHaveBeenCalled();
  });

  it("clamps empty and oversized Auto Archive duration edits to valid values", async () => {
    const user = userEvent.setup();
    renderAutoArchiveSettings(createRendererSettings({ autoArchive: { idleMinutes: 125 } }));
    const amountInput = screen.getByRole("textbox", { name: "Auto archive duration amount" });

    await user.clear(amountInput);
    await user.tab();

    await waitFor(() => {
      expect(lastSettingsPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 1 },
      });
    });
    expect(amountInput).toHaveValue("1");

    await user.click(amountInput);
    await user.clear(amountInput);
    await user.type(amountInput, "999999");
    await user.tab();

    await waitFor(() => {
      expect(lastSettingsPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 20160 },
      });
    });
    expect(amountInput).toHaveValue("20160");
  });

  it("persists Auto Archive enable changes", async () => {
    const user = userEvent.setup();
    renderAutoArchiveSettings(createRendererSettings({ autoArchive: { enabled: false } }));

    await user.click(screen.getByRole("switch", { name: "Enable auto-archive" }));

    await waitFor(() => {
      expect(lastSettingsPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 4320 },
      });
    });
  });

  it("clears Archived Blocks only after confirmation", async () => {
    const user = userEvent.setup();
    renderAutoArchiveSettings(createRendererSettings());

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("alertdialog", { name: "Clear archived data?" })).toBeVisible();
    expect(clientMocks.deleteArchivedBlocks).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Clear archive" }));

    await waitFor(() => {
      expect(clientMocks.deleteArchivedBlocks).toHaveBeenCalledOnce();
    });
    expect(blockQueryMocks.refreshBlocks).toHaveBeenCalledOnce();
    expect(toastMocks.success).toHaveBeenCalledWith("Archived data cleared.");
  });
});
