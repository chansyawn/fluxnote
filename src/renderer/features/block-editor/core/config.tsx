import { createContext, useContext, type ReactNode } from "react";

import type { BlockEditorConfig, BlockEditorConfigInput } from "./types";

export const DEFAULT_BLOCK_EDITOR_CONFIG: BlockEditorConfig = {
  markdown: {
    codeBlock: {
      showLineNumbers: false,
      wordWrap: false,
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
        wordWrap:
          config?.markdown?.codeBlock?.wordWrap ??
          DEFAULT_BLOCK_EDITOR_CONFIG.markdown.codeBlock.wordWrap,
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

const BlockEditorConfigContext = createContext<BlockEditorConfig>(DEFAULT_BLOCK_EDITOR_CONFIG);

interface BlockEditorConfigProviderProps {
  children: ReactNode;
  config: BlockEditorConfig;
}

export function BlockEditorConfigProvider({ children, config }: BlockEditorConfigProviderProps) {
  return (
    <BlockEditorConfigContext.Provider value={config}>{children}</BlockEditorConfigContext.Provider>
  );
}

export function useBlockEditorConfig(): BlockEditorConfig {
  return useContext(BlockEditorConfigContext);
}
