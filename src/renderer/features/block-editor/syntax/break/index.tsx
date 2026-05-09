import "./index.css";
import { $createLineBreakNode, $isLineBreakNode, defineExtension } from "lexical";

import type { SyntaxRegistration } from "../registration";
import { $createSoftBreakNode, $isSoftBreakNode, SoftBreakNode } from "./soft-break-node";
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
  extensions: [BREAK_SYNTAX_EXTENSION],
  lexical: {
    fromInline: (node) => {
      if ($isSoftBreakNode(node)) {
        return [{ type: "softBreak" }];
      }

      return $isLineBreakNode(node) ? [{ type: "hardBreak" }] : null;
    },
    toInline: (node) => {
      if (node.type === "softBreak") {
        return [$createSoftBreakNode()];
      }

      return node.type === "hardBreak" ? [$createLineBreakNode()] : null;
    },
  },
  markdownShortcuts: BREAK_MARKDOWN_SHORTCUT_TRANSFORMERS,
  mdast: {
    fromInline: (node) => (node.type === "break" ? [{ type: "hardBreak" }] : null),
    toInline: (node) => {
      if (node.type === "softBreak") {
        return [{ type: "text", value: "\n" }];
      }

      return node.type === "hardBreak" ? [{ type: "break" }] : null;
    },
  },
  lexicalNodeNames: ["SoftBreakNode", "LineBreakNode"],
  mdastTypes: ["break", "text"],
  semanticTypes: ["softBreak", "hardBreak"],
} satisfies SyntaxRegistration;
