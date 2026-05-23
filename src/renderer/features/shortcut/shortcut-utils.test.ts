import { describe, expect, it } from "vite-plus/test";

import {
  formatShortcutRecorderTokens,
  keyboardEventMatchesShortcut,
  normalizeShortcutPreferences,
  normalizeShortcutRecorderHotkey,
} from "./shortcut-utils";

describe("shortcut utils", () => {
  it("matches submit external edit shortcut", () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      key: "Enter",
      metaKey: true,
      shiftKey: false,
    } as KeyboardEvent;

    expect(keyboardEventMatchesShortcut(event, "Mod+Enter", "mac")).toBe(true);
  });

  it("matches cancel external edit shortcut with backslash", () => {
    const event = {
      altKey: false,
      ctrlKey: false,
      key: "\\",
      metaKey: true,
      shiftKey: false,
    } as KeyboardEvent;

    expect(keyboardEventMatchesShortcut(event, "Mod+\\", "mac")).toBe(true);
  });

  it("normalizes archive block shortcut preferences", () => {
    expect(
      normalizeShortcutPreferences(
        {
          toggleWindow: "Alt+N",
          createBlock: "Mod+N",
          copyBlock: "Mod+Shift+C",
          keepBlock: "Mod+K",
          togglePinBlock: "Mod+T",
          archiveBlock: "Mod+E",
          deleteBlock: "Mod+D",
          quickCreateBlock: "Ctrl+Alt+N",
          submitExternalEdit: "Mod+Enter",
          cancelExternalEdit: "Mod+\\",
        },
        "mac",
      )["archiveBlock"],
    ).toBe("Mod+E");
  });

  it("formats modifier-only recorder previews", () => {
    const event = {
      altKey: false,
      ctrlKey: true,
      key: "Shift",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;

    expect(formatShortcutRecorderTokens(event, "windows")).toEqual(["Ctrl", "Shift"]);
  });

  it("formats recorder previews with the final key", () => {
    const event = {
      altKey: false,
      ctrlKey: true,
      key: "k",
      metaKey: false,
      shiftKey: true,
    } as KeyboardEvent;

    expect(formatShortcutRecorderTokens(event, "windows")).toEqual(["Ctrl", "Shift", "K"]);
  });

  it("normalizes a recorded shortcut when a non-modifier key is pressed", () => {
    const event = {
      altKey: true,
      ctrlKey: true,
      key: "k",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    expect(normalizeShortcutRecorderHotkey(event, "windows")).toBe("Mod+Alt+K");
  });

  it("ignores modifier-only recorder input for persistence", () => {
    const event = {
      altKey: false,
      ctrlKey: true,
      key: "Control",
      metaKey: false,
      shiftKey: false,
    } as KeyboardEvent;

    expect(normalizeShortcutRecorderHotkey(event, "windows")).toBeNull();
  });
});
