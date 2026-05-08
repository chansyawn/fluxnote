import type {
  HeadingDepth,
  SemanticBlock,
  SemanticDocument,
  SemanticInline,
  SemanticListItem,
  SemanticTable,
  SemanticTableAlign,
  SemanticTableCell,
  SemanticTableRow,
} from "./document";
import { createEmptyDocument } from "./document";

function normalizeHeadingDepth(depth: number): HeadingDepth {
  return Math.min(Math.max(Math.trunc(depth), 1), 6) as HeadingDepth;
}

function isEmptyInline(node: SemanticInline): boolean {
  if (node.type === "text") {
    return node.value.length === 0;
  }

  if (
    node.type === "emphasis" ||
    node.type === "strong" ||
    node.type === "delete" ||
    node.type === "link"
  ) {
    return node.children.length === 0;
  }

  return false;
}

function normalizeInlineChildren(children: ReadonlyArray<SemanticInline>): SemanticInline[] {
  const normalized: SemanticInline[] = [];

  for (const child of children) {
    const nodes = normalizeInline(child);
    for (const node of nodes) {
      const previous = normalized.at(-1);
      if (previous?.type === "text" && node.type === "text") {
        previous.value += node.value;
      } else if (!isEmptyInline(node)) {
        normalized.push(node);
      }
    }
  }

  return normalized;
}

function normalizeInline(node: SemanticInline): SemanticInline[] {
  switch (node.type) {
    case "text":
      return node.value.length > 0 ? [{ type: "text", value: node.value }] : [];
    case "emphasis": {
      const children = normalizeInlineChildren(node.children);
      return children.length > 0 ? [{ children, type: "emphasis" }] : [];
    }
    case "strong": {
      const children = normalizeInlineChildren(node.children);
      return children.length > 0 ? [{ children, type: "strong" }] : [];
    }
    case "delete": {
      const children = normalizeInlineChildren(node.children);
      return children.length > 0 ? [{ children, type: "delete" }] : [];
    }
    case "inlineCode":
      return [{ type: "inlineCode", value: node.value }];
    case "link": {
      const children = normalizeInlineChildren(node.children);
      return children.length > 0
        ? [{ children, title: node.title ?? null, type: "link", url: node.url }]
        : [];
    }
    case "image":
      return [{ alt: node.alt, title: node.title ?? null, type: "image", url: node.url }];
    case "softBreak":
      return [{ type: "softBreak" }];
    case "hardBreak":
      return [{ type: "hardBreak" }];
    case "opaqueInline":
      return [
        {
          kind: node.kind || "unknown",
          markdown: node.markdown.trim(),
          ...(node.metadata ? { metadata: node.metadata } : {}),
          type: "opaqueInline",
        },
      ];
  }
}

function normalizeContainerChildren(children: ReadonlyArray<SemanticBlock>): SemanticBlock[] {
  const blocks = children.flatMap(normalizeBlock);
  return blocks.length > 0 ? blocks : [{ children: [], type: "paragraph" }];
}

function normalizeListItem(item: SemanticListItem): SemanticListItem {
  return {
    ...(typeof item.checked === "boolean" ? { checked: item.checked } : {}),
    children: normalizeContainerChildren(item.children),
    type: "listItem",
  };
}

function normalizeListItems(children: ReadonlyArray<SemanticListItem>): SemanticListItem[] {
  const normalized = children.map(normalizeListItem);
  if (!normalized.some((item) => typeof item.checked === "boolean")) {
    return normalized;
  }

  return normalized.map((item) => ({
    checked: item.checked === true,
    children: item.children,
    type: "listItem",
  }));
}

function normalizeTableAlign(value: unknown): SemanticTableAlign {
  return value === "left" || value === "center" || value === "right" ? value : null;
}

function getTableColumnCount(rows: ReadonlyArray<SemanticTableRow>): number {
  return rows.reduce((columnCount, row) => Math.max(columnCount, row.cells.length), 0);
}

function normalizeTableCell(cell: SemanticTableCell): SemanticTableCell {
  return {
    children: normalizeInlineChildren(cell.children),
    type: "tableCell",
  };
}

function normalizeTableRow(row: SemanticTableRow, columnCount: number): SemanticTableRow {
  const cells = row.cells.map(normalizeTableCell);
  while (cells.length < columnCount) {
    cells.push({ children: [], type: "tableCell" });
  }

  return {
    cells: cells.slice(0, columnCount),
    type: "tableRow",
  };
}

function normalizeTable(node: SemanticTable): SemanticTable[] {
  const columnCount = getTableColumnCount(node.rows);
  if (node.rows.length === 0 || columnCount === 0) {
    return [];
  }

  const align = Array.from({ length: columnCount }, (_, index) =>
    normalizeTableAlign(node.align[index]),
  );

  return [
    {
      align,
      rows: node.rows.map((row) => normalizeTableRow(row, columnCount)),
      type: "table",
    },
  ];
}

function normalizeBlock(node: SemanticBlock): SemanticBlock[] {
  switch (node.type) {
    case "paragraph":
      return [{ children: normalizeInlineChildren(node.children), type: "paragraph" }];
    case "heading":
      return [
        {
          children: normalizeInlineChildren(node.children),
          depth: normalizeHeadingDepth(node.depth),
          type: "heading",
        },
      ];
    case "blockquote":
      return [{ children: normalizeContainerChildren(node.children), type: "blockquote" }];
    case "list": {
      const children = normalizeListItems(node.children);
      const hasTaskItems = children.some((item) => typeof item.checked === "boolean");
      return children.length > 0
        ? [
            {
              children,
              ordered: hasTaskItems ? false : node.ordered,
              type: "list",
            },
          ]
        : [];
    }
    case "table":
      return normalizeTable(node);
    case "codeBlock":
      return [{ lang: node.lang || null, type: "codeBlock", value: node.value }];
    case "thematicBreak":
      return [{ type: "thematicBreak" }];
    case "opaqueBlock":
      return [
        {
          kind: node.kind || "unknown",
          markdown: node.markdown.trim(),
          ...(node.metadata ? { metadata: node.metadata } : {}),
          type: "opaqueBlock",
        },
      ];
  }
}

export function normalizeSemanticDocument(document: SemanticDocument): SemanticDocument {
  const children = document.children.flatMap(normalizeBlock);

  if (children.length === 0) {
    return createEmptyDocument();
  }

  return {
    children,
    type: "root",
  };
}
