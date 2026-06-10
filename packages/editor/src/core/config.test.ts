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

  it("merges partial content config", () => {
    expect(
      resolveBlockEditorConfig({
        content: {
          placeholder: "No focused input found. Write text to copy.",
        },
      }),
    ).toEqual({
      ...DEFAULT_BLOCK_EDITOR_CONFIG,
      content: {
        placeholder: "No focused input found. Write text to copy.",
      },
    });
  });
});
