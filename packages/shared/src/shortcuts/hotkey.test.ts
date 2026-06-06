import { describe, expect, it } from "vite-plus/test";

import {
  formatShortcutRecorderTokens,
  formatShortcutTokens,
  keyboardEventMatchesShortcut,
  normalizeShortcutRecorderHotkey,
  type ShortcutBinding,
} from "./hotkey";

describe("shortcut hotkey semantics", () => {
  it("matches Mod shortcuts on macOS", () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      key: "Enter",
      metaKey: true,
      shiftKey: false,
    } as KeyboardEvent;

    expect(keyboardEventMatchesShortcut(event, "Mod+Enter", "mac")).toBe(true);
  });

  it("matches backslash shortcuts", () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      key: "\\",
      metaKey: true,
      shiftKey: false,
    } as KeyboardEvent;

    expect(keyboardEventMatchesShortcut(event, "Mod+\\", "mac")).toBe(true);
  });

  it("matches Return and Escape aliases", () => {
    expect(
      keyboardEventMatchesShortcut(
        { altKey: false, ctrlKey: true, key: "Enter", metaKey: false, shiftKey: false },
        "Control+Return" as ShortcutBinding,
      ),
    ).toBe(true);
    expect(
      keyboardEventMatchesShortcut(
        { altKey: false, ctrlKey: true, key: "Escape", metaKey: false, shiftKey: false },
        "Control+Esc" as ShortcutBinding,
      ),
    ).toBe(true);
  });

  it("formats persisted shortcuts", () => {
    expect(formatShortcutTokens("Control+Shift+K", "windows")).toEqual(["Ctrl", "Shift", "K"]);
  });

  it("formats recorder previews", () => {
    const modifierOnlyEvent = {
      altKey: false,
      ctrlKey: true,
      key: "Shift",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;
    const completeEvent = {
      altKey: false,
      ctrlKey: true,
      key: "k",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;

    expect(formatShortcutRecorderTokens(modifierOnlyEvent, "windows")).toEqual(["Ctrl", "Shift"]);
    expect(formatShortcutRecorderTokens(completeEvent, "windows")).toEqual(["Ctrl", "Shift", "K"]);
  });

  it("normalizes recorder input only when a non-modifier key is pressed", () => {
    const completeEvent = {
      altKey: true,
      ctrlKey: true,
      key: "k",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent;
    const modifierOnlyEvent = {
      altKey: false,
      ctrlKey: true,
      key: "Control",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    expect(normalizeShortcutRecorderHotkey(completeEvent, "windows")).toBe("Mod+Alt+K");
    expect(normalizeShortcutRecorderHotkey(modifierOnlyEvent, "windows")).toBeNull();
  });
});
