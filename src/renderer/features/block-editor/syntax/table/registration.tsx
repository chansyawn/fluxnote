import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { TABLE } from "./table-shortcut";

export const TABLE_SYNTAX = {
  id: "table",
  lexicalNodeNames: ["TableNode", "TableRowNode", "TableCellNode"],
  markdownShortcuts: [TABLE],
  mdastTypes: ["table", "tableRow", "tableCell"],
  nodes: [TableNode, TableRowNode, TableCellNode],
  runtimePlugins: () => [
    <TablePlugin
      key="table"
      hasCellBackgroundColor={false}
      hasCellMerge={false}
      hasHorizontalScroll
      hasNestedTables={false}
      hasTabHandler
    />,
  ],
  semanticTypes: ["table", "tableRow", "tableCell"],
  theme: {
    table: "block-editor__table",
    tableCell: "block-editor__table-cell",
    tableCellHeader: "block-editor__table-cell block-editor__table-cell--header",
    tableCellSelected: "block-editor__table-cell--selected",
    tableRow: "block-editor__table-row",
    tableScrollableWrapper: "block-editor__table-scrollable-wrapper",
    tableSelected: "block-editor__table--selected",
    tableSelection: "block-editor__table-selection",
  },
} satisfies SyntaxRegistration;
