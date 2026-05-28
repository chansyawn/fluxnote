// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import { resolveTextFormatShortcut } from "./text-format-shortcuts";

function createKeyboardEvent(shortcut: {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}): KeyboardEvent {
  return {
    altKey: shortcut.altKey ?? false,
    ctrlKey: shortcut.ctrlKey ?? false,
    key: shortcut.key,
    metaKey: shortcut.metaKey ?? false,
    shiftKey: shortcut.shiftKey ?? false,
  } as KeyboardEvent;
}

describe("resolveTextFormatShortcut", () => {
  it("resolves configured text format shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "b", shiftKey: true });

    expect(
      resolveTextFormatShortcut(event, {
        bold: "Control+Shift+B",
      }),
    ).toEqual({ type: "configured", format: "bold" });
  });

  it("blocks cleared Lexical default text format shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "b" });

    expect(
      resolveTextFormatShortcut(event, {
        bold: null,
      }),
    ).toEqual({ type: "blocked-default" });
  });

  it("prefers configured shortcuts over Lexical default shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "i" });

    expect(
      resolveTextFormatShortcut(event, {
        bold: "Control+I",
        italic: null,
      }),
    ).toEqual({ type: "configured", format: "bold" });
  });

  it("blocks Lexical underline shortcut that Fluxnote does not configure", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "u" });

    expect(resolveTextFormatShortcut(event, {})).toEqual({ type: "blocked-default" });
  });

  it("ignores non-text-format shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "k" });

    expect(resolveTextFormatShortcut(event, {})).toEqual({ type: "none" });
  });
});
