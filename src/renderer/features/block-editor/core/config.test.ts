import {
  DEFAULT_USER_PREFERENCES,
  shortcutActionSchema,
} from "@shared/features/preferences/user-preferences";
import { describe, expect, it } from "vite-plus/test";

import { resolveBlockEditorConfig } from "./config";

describe("block editor config", () => {
  it("uses default config when input is missing", () => {
    const resolvedConfig = resolveBlockEditorConfig();

    expect(resolvedConfig.markdown.codeBlock).toEqual(DEFAULT_USER_PREFERENCES.markdown.codeBlock);
    expect(resolvedConfig.shortcuts.editor["editor.blockquote"]).toBe(
      DEFAULT_USER_PREFERENCES.shortcuts["editor.blockquote"],
    );
    expect(resolvedConfig.shortcuts.editor["editor.bold"]).toBe(
      DEFAULT_USER_PREFERENCES.shortcuts["editor.bold"],
    );
    expect(Object.keys(resolvedConfig.shortcuts.editor).sort()).toEqual(
      shortcutActionSchema.options.filter((action) => action.startsWith("editor.")).sort(),
    );
  });

  it("merges partial markdown code block config", () => {
    const resolvedConfig = resolveBlockEditorConfig({
      markdown: {
        codeBlock: {
          showLineNumbers: true,
        },
      },
    });

    expect(resolvedConfig).toMatchObject({
      markdown: {
        codeBlock: {
          showLineNumbers: true,
        },
      },
      shortcuts: {
        editor: {
          "editor.blockquote": DEFAULT_USER_PREFERENCES.shortcuts["editor.blockquote"],
        },
      },
    });
  });

  it("merges partial editor shortcut config", () => {
    const resolvedConfig = resolveBlockEditorConfig({
      shortcuts: {
        editor: {
          "editor.bold": "Control+Shift+B",
        },
      },
    });

    expect(resolvedConfig).toMatchObject({
      markdown: {
        codeBlock: DEFAULT_USER_PREFERENCES.markdown.codeBlock,
      },
      shortcuts: {
        editor: {
          "editor.blockquote": DEFAULT_USER_PREFERENCES.shortcuts["editor.blockquote"],
          "editor.bold": "Control+Shift+B",
        },
      },
    });
  });

  it("allows disabling an editor shortcut", () => {
    const resolvedConfig = resolveBlockEditorConfig({
      shortcuts: {
        editor: {
          "editor.bold": null,
        },
      },
    });

    expect(resolvedConfig.shortcuts.editor["editor.bold"]).toBeNull();
    expect(resolvedConfig.shortcuts.editor["editor.blockquote"]).toBe(
      DEFAULT_USER_PREFERENCES.shortcuts["editor.blockquote"],
    );
  });
});
