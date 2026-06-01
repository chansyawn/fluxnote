import { createContext, useContext, type ReactNode } from "react";

import type { BlockEditorConfig, BlockEditorConfigInput } from "./types";

export const DEFAULT_BLOCK_EDITOR_CONFIG: BlockEditorConfig = {
  markdown: {
    codeBlock: {
      showLineNumbers: false,
    },
  },
  shortcuts: {
    formats: {
      blockquote: null,
      bold: null,
      bulletList: null,
      codeBlock: null,
      heading1: null,
      heading2: null,
      heading3: null,
      heading4: null,
      heading5: null,
      heading6: null,
      inlineCode: null,
      italic: null,
      orderedList: null,
      paragraph: null,
      strikethrough: null,
      taskList: null,
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
      formats: {
        ...DEFAULT_BLOCK_EDITOR_CONFIG.shortcuts.formats,
        ...config?.shortcuts?.formats,
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
