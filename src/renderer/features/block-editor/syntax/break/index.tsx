import "./index.css";
import { defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import { SoftBreakNode } from "./soft-break-node";
import { SoftBreakShortcutPlugin } from "./soft-break-shortcut-plugin";

export { $createSoftBreakNode, $isSoftBreakNode, SoftBreakNode } from "./soft-break-node";
export {
  applySoftBreakAtSelection,
  registerSoftBreakShortcut,
  SoftBreakShortcutPlugin,
} from "./soft-break-shortcut-plugin";

export const BREAK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/break",
  nodes: [SoftBreakNode],
});

export const BREAK_SYNTAX = {
  id: "break",
  extension: BREAK_SYNTAX_EXTENSION,
  lexicalNodeNames: ["SoftBreakNode", "LineBreakNode"],
  mdastTypes: ["break", "text"],
  runtimePlugins: () => [<SoftBreakShortcutPlugin key="soft-break-shortcut" />],
  semanticTypes: ["softBreak", "hardBreak"],
} satisfies SyntaxRegistration;
