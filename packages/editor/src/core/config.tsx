import { createContext, useContext, type ReactNode } from "react";

import { BLOCK_EDITOR_ACTION_DEFINITIONS } from "../actions";
import type { BlockEditorConfig, BlockEditorConfigInput } from "./types";

const DEFAULT_BLOCK_EDITOR_SHORTCUT_ACTIONS = Object.fromEntries(
  BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, null]),
) as BlockEditorConfig["shortcuts"]["actions"];

export const DEFAULT_BLOCK_EDITOR_CONFIG: BlockEditorConfig = {
  appearance: {
    resolvedTheme: "light",
  },
  content: {
    placeholder: null,
  },
  markdown: {
    codeBlock: {
      showLineNumbers: false,
    },
  },
  shortcuts: {
    actions: DEFAULT_BLOCK_EDITOR_SHORTCUT_ACTIONS,
  },
};

export function resolveBlockEditorConfig(config?: BlockEditorConfigInput): BlockEditorConfig {
  return {
    appearance: {
      resolvedTheme:
        config?.appearance?.resolvedTheme ?? DEFAULT_BLOCK_EDITOR_CONFIG.appearance.resolvedTheme,
    },
    content: {
      placeholder: config?.content?.placeholder ?? DEFAULT_BLOCK_EDITOR_CONFIG.content.placeholder,
    },
    markdown: {
      codeBlock: {
        showLineNumbers:
          config?.markdown?.codeBlock?.showLineNumbers ??
          DEFAULT_BLOCK_EDITOR_CONFIG.markdown.codeBlock.showLineNumbers,
      },
    },
    shortcuts: {
      actions: {
        ...DEFAULT_BLOCK_EDITOR_CONFIG.shortcuts.actions,
        ...config?.shortcuts?.actions,
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
