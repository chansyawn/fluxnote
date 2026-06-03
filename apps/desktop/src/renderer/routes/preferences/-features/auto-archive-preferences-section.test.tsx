// @vitest-environment jsdom

import { USER_PREFERENCES_QUERY_KEY } from "@renderer/features/preferences/preferences-query";
import { createRendererUserPreferences } from "@renderer/test/fixtures";
import { createTestQueryClient, renderWithProviders } from "@renderer/test/render";
import type {
  UserPreferences,
  UserPreferencesPatch,
} from "@shared/features/preferences/user-preferences";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const clientMocks = vi.hoisted(() => ({
  deleteArchivedBlocks: vi.fn(),
  onPreferencesChanged: vi.fn(),
  patchUserPreferences: vi.fn(),
  readUserPreferences: vi.fn(),
  resetUserPreferences: vi.fn(),
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
  patchUserPreferences: clientMocks.patchUserPreferences,
  readUserPreferences: clientMocks.readUserPreferences,
  resetUserPreferences: clientMocks.resetUserPreferences,
  toAppInvokeError: (error: unknown) => ({
    message: error instanceof Error ? error.message : "Unknown error",
  }),
}));

vi.mock("@renderer/features/blocks/block-query", () => ({
  refreshBlocks: blockQueryMocks.refreshBlocks,
}));

vi.mock("@fluxnotes/ui/components/sonner", () => ({
  toast: toastMocks,
}));

vi.mock("@lingui/react/macro", async () => {
  const React = await import("react");

  return {
    Trans: ({ children }: { children?: ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { AutoArchivePreferencesSection } from "./auto-archive-preferences-section";

function setupUserPreferences(initialPreferences: UserPreferences): UserPreferences {
  let preferences = initialPreferences;
  clientMocks.readUserPreferences.mockImplementation(async () => preferences);
  clientMocks.patchUserPreferences.mockImplementation(async (patch: UserPreferencesPatch) => {
    preferences = createRendererUserPreferences({
      ...preferences,
      ...patch,
      appearance: { ...preferences.appearance, ...patch.appearance },
      autoArchive: { ...preferences.autoArchive, ...patch.autoArchive },
      markdown: {
        ...preferences.markdown,
        ...patch.markdown,
        codeBlock: {
          ...preferences.markdown.codeBlock,
          ...patch.markdown?.codeBlock,
        },
      },
      shortcuts: { ...preferences.shortcuts, ...patch.shortcuts },
      telemetry: { ...preferences.telemetry, ...patch.telemetry },
    });
    return preferences;
  });
  return preferences;
}

function renderAutoArchivePreferences(initialPreferences: UserPreferences) {
  const preferences = setupUserPreferences(initialPreferences);
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(USER_PREFERENCES_QUERY_KEY, preferences);

  return renderWithProviders(<AutoArchivePreferencesSection />, { queryClient });
}

function lastUserPreferencesPatch(): UserPreferencesPatch {
  const patch = clientMocks.patchUserPreferences.mock.calls.at(-1)?.[0];
  if (!patch) {
    throw new Error("Expected User Preferences to be patched.");
  }
  return patch;
}

describe("AutoArchivePreferencesSection", () => {
  beforeEach(() => {
    clientMocks.deleteArchivedBlocks.mockResolvedValue({ deletedCount: 0 });
    clientMocks.onPreferencesChanged.mockReturnValue(() => undefined);
  });

  afterEach(() => {
    clientMocks.deleteArchivedBlocks.mockReset();
    clientMocks.onPreferencesChanged.mockReset();
    clientMocks.patchUserPreferences.mockReset();
    clientMocks.readUserPreferences.mockReset();
    clientMocks.resetUserPreferences.mockReset();
    blockQueryMocks.refreshBlocks.mockReset();
    toastMocks.error.mockReset();
    toastMocks.success.mockReset();
  });

  it("shows the Auto Archive duration in canonical units", () => {
    renderAutoArchivePreferences(
      createRendererUserPreferences({ autoArchive: { idleMinutes: 60 } }),
    );

    expect(screen.getByRole("textbox", { name: "Auto archive duration amount" })).toHaveValue("1");
    expect(screen.getByRole("combobox", { name: "Auto archive duration unit" })).toHaveTextContent(
      "hours",
    );
  });

  it("saves Auto Archive duration when the user leaves the amount field", async () => {
    const user = userEvent.setup();
    renderAutoArchivePreferences(
      createRendererUserPreferences({ autoArchive: { idleMinutes: 125 } }),
    );
    const amountInput = screen.getByRole("textbox", { name: "Auto archive duration amount" });

    await user.clear(amountInput);
    await user.type(amountInput, "60");

    expect(clientMocks.patchUserPreferences).not.toHaveBeenCalled();

    await user.tab();

    await waitFor(() => {
      expect(lastUserPreferencesPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 60 },
      });
    });
    expect(amountInput).toHaveValue("60");
  });

  it("rejects non-digit Auto Archive duration edits", async () => {
    const user = userEvent.setup();
    renderAutoArchivePreferences(
      createRendererUserPreferences({ autoArchive: { idleMinutes: 125 } }),
    );
    const amountInput = screen.getByRole("textbox", { name: "Auto archive duration amount" });

    await user.click(amountInput);
    await user.keyboard("a");

    expect(amountInput).toHaveValue("125");
    expect(clientMocks.patchUserPreferences).not.toHaveBeenCalled();
  });

  it("clamps empty and oversized Auto Archive duration edits to valid values", async () => {
    const user = userEvent.setup();
    renderAutoArchivePreferences(
      createRendererUserPreferences({ autoArchive: { idleMinutes: 125 } }),
    );
    const amountInput = screen.getByRole("textbox", { name: "Auto archive duration amount" });

    await user.clear(amountInput);
    await user.tab();

    await waitFor(() => {
      expect(lastUserPreferencesPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 1 },
      });
    });
    expect(amountInput).toHaveValue("1");

    await user.click(amountInput);
    await user.clear(amountInput);
    await user.type(amountInput, "999999");
    await user.tab();

    await waitFor(() => {
      expect(lastUserPreferencesPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 20160 },
      });
    });
    expect(amountInput).toHaveValue("20160");
  });

  it("persists Auto Archive enable changes", async () => {
    const user = userEvent.setup();
    renderAutoArchivePreferences(
      createRendererUserPreferences({ autoArchive: { enabled: false } }),
    );

    await user.click(screen.getByRole("switch", { name: "Enable auto-archive" }));

    await waitFor(() => {
      expect(lastUserPreferencesPatch()).toEqual({
        autoArchive: { enabled: true, idleMinutes: 4320 },
      });
    });
  });

  it("clears Archived Blocks only after confirmation", async () => {
    const user = userEvent.setup();
    renderAutoArchivePreferences(createRendererUserPreferences());

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
