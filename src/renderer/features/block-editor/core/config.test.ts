import { describe, expect, it } from "vite-plus/test";

import { DEFAULT_BLOCK_EDITOR_CONFIG, resolveBlockEditorConfig } from "./config";

describe("block editor config", () => {
  it("uses default config when input is missing", () => {
    expect(resolveBlockEditorConfig()).toEqual(DEFAULT_BLOCK_EDITOR_CONFIG);
  });

  it("merges partial markdown code block config", () => {
    expect(
      resolveBlockEditorConfig({
        markdown: {
          codeBlock: {
            showLineNumbers: true,
          },
        },
      }),
    ).toEqual({
      ...DEFAULT_BLOCK_EDITOR_CONFIG,
      markdown: {
        codeBlock: {
          showLineNumbers: true,
        },
      },
    });
  });

  it("merges partial editor shortcut config", () => {
    expect(
      resolveBlockEditorConfig({
        shortcuts: {
          editor: {
            "editor.bold": "Control+Shift+B",
          },
        },
      }),
    ).toEqual({
      ...DEFAULT_BLOCK_EDITOR_CONFIG,
      shortcuts: {
        ...DEFAULT_BLOCK_EDITOR_CONFIG.shortcuts,
        editor: {
          ...DEFAULT_BLOCK_EDITOR_CONFIG.shortcuts.editor,
          "editor.bold": "Control+Shift+B",
        },
      },
    });
  });
});
