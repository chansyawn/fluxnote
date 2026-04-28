import {
  getShortcutDisplayTokens,
  getShortcutFromKeyboardEvent,
  getShortcutPreviewTokens,
  normalizeShortcut,
} from "@renderer/features/shortcut/shortcut-utils";
import { describe, expect, it } from "vite-plus/test";

function keyboardEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    altKey: false,
    code: "",
    ctrlKey: false,
    key: "",
    metaKey: false,
    shiftKey: false,
    ...overrides,
  } as KeyboardEvent;
}

describe("shortcut-utils", () => {
  it("rejects a single non-modifier key as a shortcut", () => {
    expect(getShortcutFromKeyboardEvent(keyboardEvent({ code: "KeyA", key: "a" }))).toBeNull();
    expect(normalizeShortcut("A")).toBeNull();
  });

  it("normalizes and displays command letter shortcuts", () => {
    const shortcut = getShortcutFromKeyboardEvent(
      keyboardEvent({ code: "KeyA", key: "a", metaKey: true }),
    );

    expect(shortcut).toBe("Command+A");
    expect(normalizeShortcut("Command+A")).toBe("Command+A");
    expect(getShortcutDisplayTokens(shortcut)).toEqual(["Cmd", "A"]);
  });

  it("normalizes modifier order and displays space shortcuts", () => {
    expect(normalizeShortcut("Shift+Control+Space")).toBe("Control+Shift+Space");
    expect(getShortcutDisplayTokens("Shift+Control+Space")).toEqual(["Ctrl", "Shift", "Space"]);
  });

  it("previews modifier-only keydown without capturing a shortcut", () => {
    const event = keyboardEvent({ code: "ShiftLeft", key: "Shift", shiftKey: true });

    expect(getShortcutPreviewTokens(event)).toEqual(["Shift"]);
    expect(getShortcutFromKeyboardEvent(event)).toBeNull();
  });
});
