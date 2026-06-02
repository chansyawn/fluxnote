import { $createCodeNode } from "@lexical/code";
import { $createHeadingNode } from "@lexical/rich-text";
import { $isTableCellNode, TableCellHeaderStates } from "@lexical/table";
import {
  CONTROLLED_TEXT_INSERTION_COMMAND,
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  type ElementFormatType,
  type LexicalCommand,
  type LexicalEditor,
  type NodeKey,
} from "lexical";
import type { Table } from "mdast";
import { describe, expect, it } from "vite-plus/test";

import { expectMarkdownRoundTripStable } from "../../test-helper/assertions";
import {
  createHeadlessEditor,
  editorFromMarkdown,
  readMdast,
} from "../../test-helper/editor-driver";
import { pressEnter, selectText } from "../../test-helper/interaction-driver";
import {
  performTableStructureOperation,
  type TableColumnAlign,
  type TableStructureOperation,
} from "./table-operations";

function getTable(editor: LexicalEditor): Table {
  const child = readMdast(editor).children[0];
  expect(child?.type).toBe("table");
  return child as Table;
}

function getCellKey(editor: LexicalEditor, rowIndex: number, columnIndex: number): NodeKey {
  let key: NodeKey | null = null;

  editor.getEditorState().read(() => {
    const table = $getRoot()
      .getChildren()
      .find((child) => child.getType() === "table");
    const row = $isElementNode(table) ? table.getChildAtIndex(rowIndex) : null;
    const cell = $isElementNode(row) ? row.getChildAtIndex(columnIndex) : null;
    key = cell?.getKey() ?? null;
  });

  if (!key) {
    throw new Error(`Unable to find table cell at ${rowIndex}, ${columnIndex}.`);
  }

  return key;
}

function cellHasRowHeader(editor: LexicalEditor, rowIndex: number, columnIndex: number): boolean {
  let headerState: number | null = null;

  editor.getEditorState().read(() => {
    const table = $getRoot()
      .getChildren()
      .find((child) => child.getType() === "table");
    const row = $isElementNode(table) ? table.getChildAtIndex(rowIndex) : null;
    const cell = $isElementNode(row) ? row.getChildAtIndex(columnIndex) : null;
    headerState = $isTableCellNode(cell) ? cell.getHeaderStyles() : null;
  });

  if (headerState === null) {
    throw new Error(`Unable to read table cell header at ${rowIndex}, ${columnIndex}.`);
  }

  return (headerState & TableCellHeaderStates.ROW) === TableCellHeaderStates.ROW;
}

function getCellFormat(
  editor: LexicalEditor,
  rowIndex: number,
  columnIndex: number,
): ElementFormatType {
  let format: ElementFormatType | null = null;

  editor.getEditorState().read(() => {
    const table = $getRoot()
      .getChildren()
      .find((child) => child.getType() === "table");
    const row = $isElementNode(table) ? table.getChildAtIndex(rowIndex) : null;
    const cell = $isElementNode(row) ? row.getChildAtIndex(columnIndex) : null;
    const paragraph = $isElementNode(cell) ? cell.getFirstChild() : null;
    format = $isParagraphNode(paragraph) ? paragraph.getFormatType() : null;
  });

  if (format === null) {
    throw new Error(`Unable to read table cell format at ${rowIndex}, ${columnIndex}.`);
  }

  return format;
}

function createEditorWithTypedTableShortcut(delimiter = "| --- | --- |"): LexicalEditor {
  const editor = createHeadlessEditor();

  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.append(
        $createParagraphNode().append($createTextNode("| h1 | h2 |")),
        $createParagraphNode().append($createTextNode(delimiter)),
      );
      root.getLastChild()?.selectEnd();
    },
    { discrete: true },
  );

  return editor;
}

function createEditorWithTypedTableDimensionShortcut(shortcut = "|3x2|"): LexicalEditor {
  const editor = createHeadlessEditor();

  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      root.append($createParagraphNode().append($createTextNode(shortcut)));
      root.getLastChild()?.selectEnd();
    },
    { discrete: true },
  );

  return editor;
}

function performOperation(
  editor: LexicalEditor,
  rowIndex: number,
  columnIndex: number,
  operation: TableStructureOperation,
): void {
  performTableStructureOperation(editor, {
    cellKey: getCellKey(editor, rowIndex, columnIndex),
    operation,
  });
}

function performAlignOperation(
  editor: LexicalEditor,
  rowIndex: number,
  columnIndex: number,
  align: TableColumnAlign,
): void {
  performTableStructureOperation(editor, {
    align,
    cellKey: getCellKey(editor, rowIndex, columnIndex),
    operation: "set-column-align",
  });
}

function dispatchCommand<TPayload>(
  editor: LexicalEditor,
  command: LexicalCommand<TPayload>,
  payload: TPayload,
): boolean {
  let handled = false;
  editor.update(
    () => {
      handled = editor.dispatchCommand(command, payload);
    },
    { discrete: true },
  );
  return handled;
}

function typeText(editor: LexicalEditor, text: string): void {
  for (const character of text) {
    dispatchCommand(editor, CONTROLLED_TEXT_INSERTION_COMMAND, character);
  }
}

function readSelection(editor: LexicalEditor): { nodeText: string; offset: number } {
  return editor.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      throw new Error("Expected range selection.");
    }

    return {
      nodeText: selection.anchor.getNode().getTextContent(),
      offset: selection.anchor.offset,
    };
  });
}

function readAnchorCellPosition(editor: LexicalEditor): {
  columnIndex: number;
  nodeText: string;
  offset: number;
  rowIndex: number;
} {
  return editor.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      throw new Error("Expected range selection.");
    }

    const anchorNode = selection.anchor.getNode();
    const paragraph = $isParagraphNode(anchorNode) ? anchorNode : anchorNode.getParent();
    const cell = paragraph?.getParent();
    const row = cell?.getParent();
    const table = row?.getParent();
    if (!$isElementNode(paragraph) || !$isElementNode(cell) || !$isElementNode(row) || !table) {
      throw new Error("Expected selection inside a table cell paragraph.");
    }

    return {
      columnIndex: cell.getIndexWithinParent(),
      nodeText: selection.anchor.getNode().getTextContent(),
      offset: selection.anchor.offset,
      rowIndex: row.getIndexWithinParent(),
    };
  });
}

describe("table", () => {
  it("round-trips a simple table", () => {
    const markdown = ["| h1 | h2 |", "| -- | -- |", "| a  | b  |", ""].join("\n");
    expectMarkdownRoundTripStable(markdown);
  });

  it("round-trips a table with column alignment", () => {
    const markdown = [
      "| left | center | right | default |",
      "| :--- | :----: | ----: | --- |",
      "| a    | b      | c     | d |",
      "",
    ].join("\n");
    expectMarkdownRoundTripStable(markdown);

    expect(getTable(editorFromMarkdown(markdown)).align).toEqual(["left", "center", "right", null]);
  });

  it("pads ragged table rows during markdown import", () => {
    const editor = editorFromMarkdown(
      ["| h1 | h2 | h3 |", "| -- | -- | -- |", "| a  |", ""].join("\n"),
    );

    expect(getTable(editor).children[1].children).toMatchObject([
      { children: [{ type: "text", value: "a" }], type: "tableCell" },
      { children: [], type: "tableCell" },
      { children: [], type: "tableCell" },
    ]);
  });

  it("normalizes block children inside cells to markdown-compatible text", () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", "| a  |", ""].join("\n"));
    const cellKey = getCellKey(editor, 1, 0);

    editor.update(
      () => {
        const cell = $getNodeByKey(cellKey);
        if (!$isTableCellNode(cell)) {
          throw new Error("Unable to find table cell.");
        }

        cell.append(
          $createHeadingNode("h2").append($createTextNode("Heading")),
          $createCodeNode().append($createTextNode("const x = 1;")),
        );
      },
      { discrete: true },
    );

    expect(getTable(editor).children[1].children[0].children).toEqual([
      { type: "text", value: "a ## Heading ```\nconst x = 1;\n```" },
    ]);
  });

  it("keeps heading markdown shortcuts literal inside cells without moving the caret", () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", "| a  |", ""].join("\n"));
    selectText(editor, "a", 0);

    typeText(editor, "# ");

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [
        {
          children: [{ children: [{ type: "text", value: "h1" }], type: "tableCell" }],
          type: "tableRow",
        },
        {
          children: [{ children: [{ type: "text", value: "# a" }], type: "tableCell" }],
          type: "tableRow",
        },
      ],
      type: "table",
    });
    expect(readSelection(editor)).toEqual({
      nodeText: "# a",
      offset: 2,
    });
  });

  it("typed delimiter shortcut creates a table", () => {
    const editor = createEditorWithTypedTableShortcut();

    expect(pressEnter(editor)).toBe(true);
    const result = readMdast(editor);

    expect(result.children[0]).toMatchObject({
      children: [
        {
          children: [
            { children: [{ type: "text", value: "h1" }], type: "tableCell" },
            { children: [{ type: "text", value: "h2" }], type: "tableCell" },
          ],
          type: "tableRow",
        },
        {
          children: [
            { children: [], type: "tableCell" },
            { children: [], type: "tableCell" },
          ],
          type: "tableRow",
        },
      ],
      type: "table",
    });
  });

  it("typed delimiter shortcut creates aligned table columns", () => {
    const editor = createEditorWithTypedTableShortcut("| :--- | ---: |");

    expect(pressEnter(editor)).toBe(true);

    expect(getTable(editor).align).toEqual(["left", "right"]);
    expect(getCellFormat(editor, 0, 0)).toBe("left");
    expect(getCellFormat(editor, 1, 0)).toBe("left");
    expect(getCellFormat(editor, 0, 1)).toBe("right");
    expect(getCellFormat(editor, 1, 1)).toBe("right");
  });

  it("typed dimension shortcut creates an empty table on Enter", () => {
    const editor = createEditorWithTypedTableDimensionShortcut();

    expect(pressEnter(editor)).toBe(true);

    const table = getTable(editor);
    expect(table.align).toEqual([null, null, null]);
    expect(table.children).toHaveLength(2);
    expect(table.children[0].children).toHaveLength(3);
    expect(table.children[1].children).toHaveLength(3);
    expect(cellHasRowHeader(editor, 0, 0)).toBe(true);
    expect(cellHasRowHeader(editor, 1, 0)).toBe(false);
    expect(readAnchorCellPosition(editor)).toEqual({
      columnIndex: 0,
      nodeText: "",
      offset: 0,
      rowIndex: 0,
    });
  });

  it("typed dimension shortcut creates an empty table on trailing Space", () => {
    const editor = createEditorWithTypedTableDimensionShortcut();

    typeText(editor, " ");

    const table = getTable(editor);
    expect(table.children).toHaveLength(2);
    expect(table.children[0].children).toHaveLength(3);
  });

  it("typed dimension shortcut accepts spaces and uppercase separators", () => {
    const editor = createEditorWithTypedTableDimensionShortcut("| 3 X 2 |");

    expect(pressEnter(editor)).toBe(true);

    const table = getTable(editor);
    expect(table.children).toHaveLength(2);
    expect(table.children[0].children).toHaveLength(3);
  });

  it("typed dimension shortcut creates a one-cell minimum table", () => {
    const editor = createEditorWithTypedTableDimensionShortcut("|1x1|");

    expect(pressEnter(editor)).toBe(true);

    const table = getTable(editor);
    expect(table.children).toHaveLength(1);
    expect(table.children[0].children).toHaveLength(1);
    expect(cellHasRowHeader(editor, 0, 0)).toBe(true);
  });

  it("keeps invalid typed dimension shortcuts as text", () => {
    for (const shortcut of ["|0x2|", "|21x2|", "|3x21|", "|abc|"]) {
      const editor = createEditorWithTypedTableDimensionShortcut(shortcut);

      pressEnter(editor);
      expect(readMdast(editor).children[0]).toMatchObject({
        children: [{ type: "text", value: shortcut }],
        type: "paragraph",
      });
    }
  });

  it("imports dimension shortcut text as a paragraph", () => {
    const editor = editorFromMarkdown("|3x2|");

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [{ type: "text", value: "|3x2|" }],
      type: "paragraph",
    });
  });

  it("keeps dimension shortcuts literal inside cells", () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", "| a  |", ""].join("\n"));
    selectText(editor, "a", 0);

    typeText(editor, "|3x2| ");

    expect(readMdast(editor).children[0]).toMatchObject({
      children: [
        {
          children: [{ children: [{ type: "text", value: "h1" }], type: "tableCell" }],
          type: "tableRow",
        },
        {
          children: [{ children: [{ type: "text", value: "|3x2| a" }], type: "tableCell" }],
          type: "tableRow",
        },
      ],
      type: "table",
    });
  });

  it("performs row and column structure operations", () => {
    const editor = editorFromMarkdown(
      ["| h1 | h2 |", "| -- | -- |", "| a  | b  |", "| c  | d  |", ""].join("\n"),
    );

    performOperation(editor, 1, 1, "insert-column-left");
    expect(getTable(editor).children[0].children).toHaveLength(3);

    performOperation(editor, 2, 0, "move-row-up");
    expect(getTable(editor).children[1].children[0]).toMatchObject({
      children: [{ type: "text", value: "c" }],
    });

    performOperation(editor, 1, 0, "delete-row");
    expect(getTable(editor).children).toHaveLength(2);

    performOperation(editor, 0, 1, "delete-column");
    expect(getTable(editor).children[0].children).toHaveLength(2);
  });

  it("sets and clears column alignment", () => {
    const editor = editorFromMarkdown(
      ["| h1 | h2 |", "| -- | -- |", "| a  | b  |", "| c  | d  |", ""].join("\n"),
    );

    performAlignOperation(editor, 1, 1, "center");

    expect(getTable(editor).align).toEqual([null, "center"]);
    expect(getCellFormat(editor, 0, 1)).toBe("center");
    expect(getCellFormat(editor, 1, 1)).toBe("center");
    expect(getCellFormat(editor, 2, 1)).toBe("center");

    performAlignOperation(editor, 0, 1, "none");

    expect(getTable(editor).align).toEqual([null, null]);
    expect(getCellFormat(editor, 0, 1)).toBe("");
    expect(getCellFormat(editor, 1, 1)).toBe("");
    expect(getCellFormat(editor, 2, 1)).toBe("");
  });

  it("keeps row header styles anchored to the first row when moving rows", () => {
    const editor = editorFromMarkdown(
      ["| h1 | h2 |", "| -- | -- |", "| a  | b  |", "| c  | d  |", ""].join("\n"),
    );

    performOperation(editor, 0, 0, "move-row-down");

    expect(cellHasRowHeader(editor, 0, 0)).toBe(true);
    expect(cellHasRowHeader(editor, 0, 1)).toBe(true);
    expect(cellHasRowHeader(editor, 1, 0)).toBe(false);
    expect(cellHasRowHeader(editor, 1, 1)).toBe(false);

    performOperation(editor, 1, 0, "move-row-up");

    expect(cellHasRowHeader(editor, 0, 0)).toBe(true);
    expect(cellHasRowHeader(editor, 0, 1)).toBe(true);
    expect(cellHasRowHeader(editor, 1, 0)).toBe(false);
    expect(cellHasRowHeader(editor, 1, 1)).toBe(false);
  });

  it("does not delete the last row or last column", () => {
    const editor = editorFromMarkdown(["| h1 |", "| -- |", ""].join("\n"));

    performOperation(editor, 0, 0, "delete-column");
    performOperation(editor, 0, 0, "delete-row");

    const table = getTable(editor);
    expect(table.children).toHaveLength(1);
    expect(table.children[0].children).toHaveLength(1);
  });
});
