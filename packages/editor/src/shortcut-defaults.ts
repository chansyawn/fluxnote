export const BLOCK_EDITOR_SHORTCUT_DEFAULTS = {
  "editor.paragraph": "Mod+Alt+0",
  "editor.heading1": "Mod+Alt+1",
  "editor.heading2": "Mod+Alt+2",
  "editor.heading3": "Mod+Alt+3",
  "editor.heading4": "Mod+Alt+4",
  "editor.heading5": "Mod+Alt+5",
  "editor.heading6": "Mod+Alt+6",
  "editor.blockquote": "Mod+Alt+B",
  "editor.bulletList": "Mod+Alt+8",
  "editor.orderedList": "Mod+Alt+7",
  "editor.taskList": "Mod+Alt+9",
  "editor.codeBlock": "Mod+Alt+C",
  "editor.bold": "Mod+B",
  "editor.italic": "Mod+I",
  "editor.strikethrough": "Mod+Shift+X",
  "editor.inlineCode": "Mod+Shift+E",
  "editor.link": "Mod+Shift+L",
} as const;

export type BlockEditorActionId = keyof typeof BLOCK_EDITOR_SHORTCUT_DEFAULTS;
