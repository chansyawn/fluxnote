import type {
  ElementTransformer,
  MultilineElementTransformer,
  Transformer,
} from "@lexical/markdown";
import { $isTableCellNode } from "@lexical/table";
import { $findMatchingParent, type ElementNode } from "lexical";

import type { MarkdownShortcutTransformerPatch } from "../../markdown/markdown-shortcut-extension";

function isInsideTableCell(node: ElementNode): boolean {
  return $findMatchingParent(node, $isTableCellNode) !== null;
}

function guardElementTransformer(transformer: ElementTransformer): ElementTransformer {
  return {
    ...transformer,
    replace: (parentNode, children, match, isImport) => {
      if (!isImport && isInsideTableCell(parentNode)) {
        return false;
      }

      return transformer.replace(parentNode, children, match, isImport);
    },
  };
}

function guardMultilineElementTransformer(
  transformer: MultilineElementTransformer,
): MultilineElementTransformer {
  return {
    ...transformer,
    replace: (rootNode, children, startMatch, endMatch, linesInBetween, isImport) => {
      if (!isImport && isInsideTableCell(rootNode)) {
        return false;
      }

      return transformer.replace(
        rootNode,
        children,
        startMatch,
        endMatch,
        linesInBetween,
        isImport,
      );
    },
  };
}

function guardTableCellBlockShortcut(transformer: Transformer): Transformer {
  if (transformer.type === "element") {
    return guardElementTransformer(transformer);
  }

  if (transformer.type === "multiline-element") {
    return guardMultilineElementTransformer(transformer);
  }

  return transformer;
}

export const guardTableCellBlockShortcuts: MarkdownShortcutTransformerPatch = (transformers) =>
  transformers.map(guardTableCellBlockShortcut);
