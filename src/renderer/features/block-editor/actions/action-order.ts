import type { BlockEditorActionId } from "./types";

export const BLOCK_EDITOR_SHORTCUT_ACTION_ORDER = [
  "editor.paragraph",
  "editor.heading1",
  "editor.heading2",
  "editor.heading3",
  "editor.heading4",
  "editor.heading5",
  "editor.heading6",
  "editor.codeBlock",
  "editor.bulletList",
  "editor.orderedList",
  "editor.taskList",
  "editor.blockquote",
  "editor.bold",
  "editor.italic",
  "editor.strikethrough",
  "editor.inlineCode",
  "editor.link",
] as const satisfies readonly BlockEditorActionId[];
