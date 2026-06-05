import { DEFAULT_USER_PREFERENCES } from "@shared/features/preferences/user-preferences";
import { describe, expect, it } from "vite-plus/test";

import { normalizeShortcutPreferences, validateShortcutUpdate } from "./shortcut-utils";

describe("shortcut utils", () => {
  it("normalizes archive block shortcut preferences", () => {
    expect(
      normalizeShortcutPreferences(DEFAULT_USER_PREFERENCES.shortcuts, "mac")[
        "workspace.archiveBlock"
      ],
    ).toBe("Mod+E");
  });

  it("rejects duplicate shortcut updates", () => {
    expect(
      validateShortcutUpdate(
        "workspace.createBlock",
        "Mod+E",
        normalizeShortcutPreferences(DEFAULT_USER_PREFERENCES.shortcuts, "mac"),
      ),
    ).toBe("duplicate");
  });

  it("rejects shortcut updates without modifiers", () => {
    expect(
      validateShortcutUpdate(
        "workspace.createBlock",
        "N",
        normalizeShortcutPreferences(DEFAULT_USER_PREFERENCES.shortcuts, "mac"),
      ),
    ).toBe("modifier-required");
  });
});
