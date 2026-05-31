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
    "editor.bold": "Mod+B",
    "editor.blockquote": "Mod+Alt+B",
    "editor.bulletList": "Mod+Alt+8",
    "editor.codeBlock": "Mod+Alt+C",
    "editor.heading1": "Mod+Alt+1",
    "editor.heading2": "Mod+Alt+2",
    "editor.heading3": "Mod+Alt+3",
    "editor.heading4": "Mod+Alt+4",
    "editor.heading5": "Mod+Alt+5",
    "editor.heading6": "Mod+Alt+6",
    "editor.inlineCode": "Mod+Shift+E",
    "editor.italic": "Mod+I",
    "editor.link": "Mod+Shift+L",
    "editor.orderedList": "Mod+Alt+7",
    "editor.paragraph": "Mod+Alt+0",
    "editor.strikethrough": "Mod+Shift+X",
    "editor.taskList": "Mod+Alt+9",
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
    expect(screen.getByText("Task list")).toBeVisible();
    expect(screen.getByText("Link")).toBeVisible();
  });
});
