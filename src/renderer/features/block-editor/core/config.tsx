import type { BlockEditorConfig, BlockEditorConfigInput } from "./types";

export const DEFAULT_BLOCK_EDITOR_CONFIG: BlockEditorConfig = {
  markdown: {
    codeBlock: {
      showLineNumbers: false,
    },
  },
  shortcuts: {
    editor: {
      "editor.blockquote": "Mod+Shift+B",
      "editor.bulletList": "Mod+Alt+8",
      "editor.codeBlock": "Mod+Alt+C",
      "editor.bold": "Mod+B",
      "editor.inlineCode": "Mod+Shift+E",
      "editor.italic": "Mod+I",
      "editor.strikethrough": "Mod+Shift+X",
      "editor.heading1": "Mod+Alt+1",
      "editor.link": "Mod+Shift+L",
      "editor.heading2": "Mod+Alt+2",
      "editor.heading3": "Mod+Alt+3",
      "editor.heading4": "Mod+Alt+4",
      "editor.heading5": "Mod+Alt+5",
      "editor.heading6": "Mod+Alt+6",
      "editor.orderedList": "Mod+Alt+7",
      "editor.taskList": "Mod+Alt+9",
      "editor.paragraph": "Mod+Alt+0",
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
      editor: {
        ...DEFAULT_BLOCK_EDITOR_CONFIG.shortcuts.editor,
        ...config?.shortcuts?.editor,
      },
    },
  };
}
