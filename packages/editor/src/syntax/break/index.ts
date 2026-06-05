import { defineExtension } from "lexical";

import { SoftBreakNode } from "./soft-break-node";
import { registerSoftBreakShortcut } from "./soft-break-shortcut";

export { $createSoftBreakNode, $isSoftBreakNode, SoftBreakNode } from "./soft-break-node";
export { applySoftBreakAtSelection, registerSoftBreakShortcut } from "./soft-break-shortcut";

export const BREAK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/break",
  nodes: [SoftBreakNode],
  register: registerSoftBreakShortcut,
});
