import "./index.css";
import { defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import { SoftBreakNode } from "./soft-break-node";
import { registerSoftBreakShortcut } from "./soft-break-shortcut";

export { $createSoftBreakNode, $isSoftBreakNode, SoftBreakNode } from "./soft-break-node";
export { applySoftBreakAtSelection, registerSoftBreakShortcut } from "./soft-break-shortcut";

export const BREAK_MARKDOWN_SHORTCUT_TRANSFORMERS = [];

export const BREAK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/break",
  nodes: [SoftBreakNode],
  register: registerSoftBreakShortcut,
});

export const BREAK_SYNTAX = {
  id: "break",
  extension: BREAK_SYNTAX_EXTENSION,
  lexicalNodeNames: ["SoftBreakNode", "LineBreakNode"],
  mdastTypes: ["break", "text"],
  semanticTypes: ["softBreak", "hardBreak"],
} satisfies SyntaxRegistration;
