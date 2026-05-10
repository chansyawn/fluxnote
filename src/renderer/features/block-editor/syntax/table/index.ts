import { ReactExtension } from "@lexical/react/ReactExtension";
import { TableExtension } from "@lexical/table";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { TableControlsDecorator } from "./table-controls-decorator";
import { TABLE } from "./table-shortcut";

export { tableFromLexical, tableToLexical } from "./lexical";
export { TABLE } from "./table-shortcut";

export const TABLE_MARKDOWN_SHORTCUT_TRANSFORMERS = [TABLE];

export const TABLE_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/table",
  dependencies: [
    configExtension(TableExtension, {
      hasCellBackgroundColor: false,
      hasCellMerge: false,
      hasHorizontalScroll: true,
      hasNestedTables: false,
      hasTabHandler: true,
    }),
  ],
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
});

export const TABLE_SYNTAX_REACT_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/table/react",
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [TableControlsDecorator],
    }),
  ],
});
