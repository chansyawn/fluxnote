import type { BlockEditorConfig, BlockEditorConfigInput } from "./types";

export const DEFAULT_BLOCK_EDITOR_CONFIG: BlockEditorConfig = {
  markdown: {
    codeBlock: {
      showLineNumbers: false,
    },
  },
  shortcuts: {
    textFormats: {
      bold: null,
      code: null,
      italic: null,
      strikethrough: null,
    },
  },
};

export function resolveBlockEditorConfig(config?: BlockEditorConfigInput): BlockEditorConfig {
  return {
    markdown: {
      codeBlock: {
        showLineNumbers:
          config?.markdown?.codeBlock?.showLineNumbers ??
          DEFAULT_BLOCK_EDITOR_CONFIG.markdown.codeBlock.showLineNumbers,
      },
    },
    shortcuts: {
      textFormats: {
        ...DEFAULT_BLOCK_EDITOR_CONFIG.shortcuts.textFormats,
        ...config?.shortcuts?.textFormats,
      },
    },
  };
}
