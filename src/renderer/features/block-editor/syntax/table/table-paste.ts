import {
  $getRoot,
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import type { Table } from "mdast";

import { inlineToLexical } from "../../core/inline-lexical-mdast";
import { parseMarkdownToMdast } from "../../markdown/processor";
import { tableToLexical } from "./lexical";

const GFM_TABLE_DELIMITER_LINE = /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/m;

function extractTablesFromMarkdown(markdown: string): Table[] {
  if (!GFM_TABLE_DELIMITER_LINE.test(markdown.trim())) {
    return [];
  }

  return parseMarkdownToMdast(markdown).children.flatMap((node): Table[] =>
    node.type === "table" ? [node] : [],
  );
}

function insertNodesAtSelection(nodes: LexicalNode[]): void {
  const currentSelection = $getSelection();
  if ($isRangeSelection(currentSelection) || $isNodeSelection(currentSelection)) {
    currentSelection.insertNodes(nodes);
    return;
  }

  $getRoot().append(...nodes);
  nodes.at(-1)?.selectEnd();
}

export function insertMarkdownTablesAtSelection(
  editor: LexicalEditor,
  markdown: string,
  selection: BaseSelection | null,
): boolean {
  const tables = extractTablesFromMarkdown(markdown);
  if (tables.length === 0) {
    return false;
  }

  let didInsert = false;

  editor.update(
    () => {
      if (selection) {
        $setSelection(selection.clone());
      }

      const tableNodes = tables.map((table) =>
        tableToLexical(table, (child) => inlineToLexical(child)),
      );
      if (tableNodes.length === 0) {
        return;
      }

      insertNodesAtSelection(tableNodes);
      didInsert = true;
    },
    { discrete: true },
  );

  return didInsert;
}
