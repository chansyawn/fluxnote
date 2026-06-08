// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  clearShortcut: vi.fn(),
  quickCreateBlockAndShowWindow: vi.fn(async () => undefined),
  resetShortcut: vi.fn(),
  setShortcut: vi.fn(),
  startFocusedExternalEdit: vi.fn(async () => undefined),
  syncCalls: [] as Array<{ onPressed: () => void; shortcut: string | null }>,
  toggleMainWindowVisibility: vi.fn(async () => undefined),
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
  startFocusedExternalEdit: mocks.startFocusedExternalEdit,
  toAppInvokeError: (error: unknown) => (error instanceof Error ? error : new Error("Unknown")),
  toggleMainWindowVisibility: mocks.toggleMainWindowVisibility,
}));

vi.mock("@fluxnotes/ui/components/sonner", () => ({
  toast: { error: vi.fn() },
}));

import { ShortcutStateProvider } from "./shortcut-state";

describe("ShortcutStateProvider", () => {
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
});
