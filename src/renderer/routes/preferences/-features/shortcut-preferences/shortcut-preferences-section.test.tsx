// @vitest-environment jsdom

import { renderWithProviders } from "@renderer/test/render";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  shortcuts: {
    "workspace.archiveBlock": "Mod+E",
    "workspace.cancelExternalEdit": "Mod+\\",
    "workspace.copyBlock": "Mod+Shift+C",
    "workspace.createBlock": "Mod+N",
    "workspace.deleteBlock": "Mod+D",
    "editor.formatBold": "Mod+B",
    "editor.formatInlineCode": "Mod+Shift+E",
    "editor.formatItalic": "Mod+I",
    "editor.formatStrikethrough": "Mod+Shift+X",
    "workspace.keepBlock": "Mod+K",
    "global.quickCreateBlock": "Ctrl+Alt+N",
    "workspace.submitExternalEdit": "Mod+Enter",
    "workspace.togglePinBlock": "Mod+T",
    "global.toggleWindow": "Alt+N",
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

import { ShortcutPreferencesSection } from "./shortcut-preferences-section";

describe("ShortcutPreferencesSection", () => {
  it("shows shortcuts in scoped groups", () => {
    renderWithProviders(<ShortcutPreferencesSection />);

    expect(screen.getByText("Global")).toBeVisible();
    expect(screen.getByText("Workspace")).toBeVisible();
    expect(screen.getByText("Editor")).toBeVisible();
    expect(screen.getByText("Bold")).toBeVisible();
    expect(screen.getByText("Italic")).toBeVisible();
    expect(screen.getByText("Strikethrough")).toBeVisible();
    expect(screen.getByText("Inline code")).toBeVisible();
  });
});
