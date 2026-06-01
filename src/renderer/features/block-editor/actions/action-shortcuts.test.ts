// @vitest-environment jsdom

import { describe, expect, it } from "vite-plus/test";

import { resolveBlockEditorShortcut } from "./action-shortcuts";

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

describe("resolveBlockEditorShortcut", () => {
  it("resolves configured inline format shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "b", shiftKey: true });

    expect(
      resolveBlockEditorShortcut(event, {
        "editor.bold": "Control+Shift+B",
      }),
    ).toEqual({ action: "editor.bold", type: "configured-action" });
  });

  it("resolves configured block format shortcuts", () => {
    const event = createKeyboardEvent({ altKey: true, ctrlKey: true, key: "1" });

    expect(
      resolveBlockEditorShortcut(event, {
        "editor.heading1": "Control+Alt+1",
      }),
    ).toEqual({ action: "editor.heading1", type: "configured-action" });
  });

  it("blocks cleared Lexical default text format shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "b" });

    expect(
      resolveBlockEditorShortcut(event, {
        "editor.bold": null,
      }),
    ).toEqual({ type: "blocked-default" });
  });

  it("prefers configured shortcuts over Lexical default shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "i" });

    expect(
      resolveBlockEditorShortcut(event, {
        "editor.bold": "Control+I",
        "editor.italic": null,
      }),
    ).toEqual({ action: "editor.bold", type: "configured-action" });
  });

  it("blocks Lexical underline shortcut that Fluxnote does not configure", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "u" });

    expect(resolveBlockEditorShortcut(event, {})).toEqual({ type: "blocked-default" });
  });

  it("ignores non-text-format shortcuts", () => {
    const event = createKeyboardEvent({ ctrlKey: true, key: "k" });

    expect(resolveBlockEditorShortcut(event, {})).toEqual({ type: "none" });
  });
});
