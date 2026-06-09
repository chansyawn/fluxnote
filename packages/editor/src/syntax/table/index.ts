import { ReactExtension } from "@lexical/react/ReactExtension";
import { TableExtension } from "@lexical/table";
import { mergeRegister } from "@lexical/utils";
import { configExtension, defineExtension } from "lexical";

import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import { registerTableCellClipboardInsertion } from "./table-cell-insert";
import { registerTableCellNormalization } from "./table-cell-normalize";
import { guardTableCellBlockShortcuts } from "./table-cell-shortcuts";
import { TableControlsDecorator } from "./table-controls-decorator";
import { registerTableKeyboardCommands } from "./table-keyboard-commands";
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
    configExtension(MarkdownShortcutExtension, {
      transformerPatches: [guardTableCellBlockShortcuts],
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
  register(editor) {
    return mergeRegister(
      registerTableKeyboardCommands(editor),
      registerTableCellClipboardInsertion(editor),
      registerTableCellNormalization(editor),
    );
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
