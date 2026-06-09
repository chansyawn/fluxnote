// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  clearShortcut: vi.fn(),
  quickCreateBlockAndShowWindow: vi.fn(async () => undefined),
  requestSystemPermission: vi.fn(async () => ({
    granted: true,
    permission: "macos_accessibility" as const,
    supported: true,
  })),
  resetShortcut: vi.fn(),
  setShortcut: vi.fn(),
  startFocusedExternalEdit: vi.fn(async () => undefined),
  syncCalls: [] as Array<{ onPressed: () => void; shortcut: string | null }>,
  toggleMainWindowVisibility: vi.fn(async () => undefined),
  toastError: vi.fn(),
}));

vi.mock("@renderer/features/preferences/preferences-query", () => ({
  useShortcutPreferences: () => ({
    clearShortcut: mocks.clearShortcut,
    resetShortcut: mocks.resetShortcut,
    setShortcut: mocks.setShortcut,
    shortcuts: {
      "global.externalEdit": "Ctrl+Alt+E",
      "global.quickCreateBlock": "Ctrl+Alt+N",
      "global.toggleWindow": "Alt+N",
    },
  }),
}));

vi.mock("@renderer/features/shortcut/use-global-shortcut-sync", () => ({
  useGlobalShortcutSync: (options: { onPressed: () => void; shortcut: string | null }) => {
    mocks.syncCalls.push(options);
    return null;
  },
}));

vi.mock("@renderer/clients", () => ({
  quickCreateBlockAndShowWindow: mocks.quickCreateBlockAndShowWindow,
  requestSystemPermission: mocks.requestSystemPermission,
  startFocusedExternalEdit: mocks.startFocusedExternalEdit,
  toAppInvokeError: (error: unknown) =>
    error instanceof Error
      ? Object.assign(error, { code: "INTERNAL" })
      : {
          code: (error as { code?: string }).code ?? "INTERNAL",
          message: (error as { message?: string }).message ?? "Unknown",
        },
  toggleMainWindowVisibility: mocks.toggleMainWindowVisibility,
}));

vi.mock("@fluxnotes/ui/components/sonner", () => ({
  toast: { error: mocks.toastError },
}));

import { ShortcutStateProvider } from "./shortcut-state";

describe("ShortcutStateProvider", () => {
  beforeEach(() => {
    mocks.requestSystemPermission.mockClear();
    mocks.startFocusedExternalEdit.mockReset();
    mocks.startFocusedExternalEdit.mockResolvedValue(undefined);
    mocks.toastError.mockClear();
  });

  it("starts focused External edit when the configured global shortcut is pressed", () => {
    mocks.syncCalls.length = 0;

    renderWithProviders(
      <ShortcutStateProvider>
        <div />
      </ShortcutStateProvider>,
    );

    const externalEditShortcut = mocks.syncCalls.find((call) => call.shortcut === "Ctrl+Alt+E");
    externalEditShortcut?.onPressed();

    expect(externalEditShortcut).toBeDefined();
    expect(mocks.startFocusedExternalEdit).toHaveBeenCalledTimes(1);
  });

  it("shows an Accessibility permission action when External edit lacks permission", async () => {
    mocks.syncCalls.length = 0;
    mocks.startFocusedExternalEdit.mockRejectedValue({
      code: "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
      message: "Fluxnotes needs macOS Accessibility permission.",
    });

    renderWithProviders(
      <ShortcutStateProvider>
        <div />
      </ShortcutStateProvider>,
    );

    const externalEditShortcut = mocks.syncCalls.find((call) => call.shortcut === "Ctrl+Alt+E");
    externalEditShortcut?.onPressed();
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "Accessibility permission is required.",
        expect.objectContaining({
          action: expect.objectContaining({ label: "Allow" }),
        }),
      );
    });
    const toastOptions = mocks.toastError.mock.calls[0]?.[1] as {
      action?: { onClick: () => void };
    };

    toastOptions.action?.onClick();

    expect(mocks.requestSystemPermission).toHaveBeenCalledWith({
      permission: "macos_accessibility",
    });
  });

  it("keeps normal error toasts for unrelated External edit failures", async () => {
    mocks.syncCalls.length = 0;
    mocks.startFocusedExternalEdit.mockRejectedValue(new Error("External edit failed"));

    renderWithProviders(
      <ShortcutStateProvider>
        <div />
      </ShortcutStateProvider>,
    );

    const externalEditShortcut = mocks.syncCalls.find((call) => call.shortcut === "Ctrl+Alt+E");
    externalEditShortcut?.onPressed();

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("External edit failed");
    });
  });
});
