import { createContext, useContext, type ReactNode } from "react";

import type { BlockEditorConfig, BlockEditorConfigInput } from "./types";

export const DEFAULT_BLOCK_EDITOR_CONFIG: BlockEditorConfig = {
  markdown: {
    codeBlock: {
      showLineNumbers: false,
      wordWrap: false,
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
