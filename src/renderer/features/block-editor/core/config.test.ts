import { describe, expect, it } from "vitest";

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
      markdown: {
        codeBlock: {
          showLineNumbers: true,
          wordWrap: false,
        },
      },
    });
  });
});
