import type { BlockEditorActionId } from "../actions";

export const BLOCK_EDITOR_TOOLBAR_LAYOUT = {
  blockButtons: ["editor.blockquote", "editor.codeBlock"],
  inlineButtons: [
    "editor.bold",
    "editor.italic",
    "editor.strikethrough",
    "editor.inlineCode",
    "editor.link",
  ],
  listMenu: ["editor.bulletList", "editor.orderedList", "editor.taskList"],
  textStyleMenu: [
    "editor.paragraph",
    "editor.heading1",
    "editor.heading2",
    "editor.heading3",
    "editor.heading4",
    "editor.heading5",
    "editor.heading6",
  ],
} as const satisfies Record<string, readonly BlockEditorActionId[]>;
