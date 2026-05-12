import { describe, expect, it } from "vitest";

import { keyboardEventMatchesShortcut } from "./shortcut-utils";

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
});
