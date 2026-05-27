// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  shortcuts: {
    archiveBlock: "Mod+E",
    cancelExternalEdit: "Mod+\\",
    copyBlock: "Mod+Shift+C",
    createBlock: "Mod+N",
    deleteBlock: "Mod+D",
    formatBold: "Mod+B",
    formatInlineCode: "Mod+Shift+E",
    formatItalic: "Mod+I",
    formatStrikethrough: "Mod+Shift+X",
    keepBlock: "Mod+K",
    quickCreateBlock: "Ctrl+Alt+N",
    submitExternalEdit: "Mod+Enter",
    togglePinBlock: "Mod+T",
    toggleWindow: "Alt+N",
  },
  clearShortcut: vi.fn(),
  resetShortcut: vi.fn(),
  updateShortcut: vi.fn(),
}));

vi.mock("@renderer/features/shortcut/shortcut-state", () => ({
  useShortcutState: () => ({
    shortcuts: mocks.shortcuts,
    clearShortcut: mocks.clearShortcut,
    globalShortcutErrors: {},
    resetShortcut: mocks.resetShortcut,
    updateShortcut: mocks.updateShortcut,
  }),
}));

vi.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { ShortcutSettingsSection } from "./shortcut-settings-section";

describe("ShortcutSettingsSection", () => {
  it("shows Block Editor shortcuts in their own group", () => {
    renderWithProviders(<ShortcutSettingsSection />);

    expect(screen.getByText("Workspace and app")).toBeVisible();
    expect(screen.getByText("Block Editor")).toBeVisible();
    expect(screen.getByText("Bold")).toBeVisible();
    expect(screen.getByText("Italic")).toBeVisible();
    expect(screen.getByText("Strikethrough")).toBeVisible();
    expect(screen.getByText("Inline code")).toBeVisible();
  });
});
