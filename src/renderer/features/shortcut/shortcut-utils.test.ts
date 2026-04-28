import {
  formatShortcutTokens,
  normalizeShortcutBinding,
  normalizeShortcutPreferences,
  type ShortcutPreferences,
  validateShortcutUpdate,
} from "@renderer/features/shortcut/shortcut-utils";
import { describe, expect, it } from "vite-plus/test";

const shortcuts: ShortcutPreferences = {
  "toggle-window": "Alt+N",
  "create-block": "Mod+N",
  "delete-block": "Mod+W",
};

describe("shortcut-utils", () => {
  it("normalizes aliases and case with TanStack Hotkeys", () => {
    expect(normalizeShortcutBinding("ctrl+n", "mac")).toBe("Control+N");
    expect(normalizeShortcutBinding("Command+N", "mac")).toBe("Mod+N");
    expect(normalizeShortcutBinding("Mod+N", "mac")).toBe("Mod+N");
  });

  it("rejects single-key shortcuts by business rule", () => {
    expect(validateShortcutUpdate("create-block", "A", shortcuts)).toBe("modifier-required");
  });

  it("rejects duplicate shortcuts across actions", () => {
    expect(validateShortcutUpdate("delete-block", "Command+N", shortcuts)).toBe("duplicate");
  });

  it("normalizes persisted shortcut preferences into a complete record", () => {
    expect(
      normalizeShortcutPreferences({
        "toggle-window": "Option+N",
        "create-block": "Command+N",
        "delete-block": null,
      }),
    ).toEqual({
      "toggle-window": "Alt+N",
      "create-block": "Mod+N",
      "delete-block": null,
    });
  });

  it("formats shortcuts into stable display tokens", () => {
    expect(formatShortcutTokens("Mod+Shift+N", "mac")).toEqual(["Cmd", "Shift", "N"]);
  });
});
