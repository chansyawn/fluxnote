import type {
  AlignType,
  BlockContent,
  Heading,
  Link,
  ListItem,
  PhrasingContent,
  Root,
  Table,
  TableCell,
  TableRow,
} from "mdast";

function clampHeadingDepth(depth: number): Heading["depth"] {
  return Math.min(Math.max(Math.trunc(depth), 1), 6) as Heading["depth"];
}

function isEmptyInline(node: PhrasingContent): boolean {
  if (node.type === "text") return node.value.length === 0;
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

function normalizeInlines(children: ReadonlyArray<PhrasingContent>): PhrasingContent[] {
  const result: PhrasingContent[] = [];
  for (const child of children) {
    const normalized = normalizeInline(child);
    if (!normalized) continue;
    const previous = result.at(-1);
    if (previous?.type === "text" && normalized.type === "text") {
      previous.value += normalized.value;
    } else if (!isEmptyInline(normalized)) {
      result.push(normalized);
    }
  }
  return result;
}

function normalizeInline(node: PhrasingContent): PhrasingContent | null {
  switch (node.type) {
    case "text":
      return node.value.length > 0 ? { type: "text", value: node.value } : null;
    case "emphasis":
    case "strong":
    case "delete": {
      const children = normalizeInlines(node.children);
      if (children.length === 0) return null;
      if (node.type === "emphasis") return { children, type: "emphasis" };
      if (node.type === "strong") return { children, type: "strong" };
      return { children, type: "delete" };
    }
    case "link": {
      const children = normalizeInlines(node.children) as Link["children"];
      return children.length > 0
        ? { children, title: node.title ?? null, type: "link", url: node.url }
        : null;
    }
    default:
      return node;
  }
}

function normalizeContainerChildren(children: ReadonlyArray<BlockContent>): BlockContent[] {
  const blocks = children.flatMap(normalizeBlock);
  return blocks.length > 0 ? blocks : [{ children: [], type: "paragraph" }];
}

function ensureListItemStartsWithParagraph(children: ReadonlyArray<BlockContent>): BlockContent[] {
  return children[0]?.type === "paragraph"
    ? [...children]
    : [{ children: [], type: "paragraph" }, ...children];
}

function shouldSpreadListItem(children: ReadonlyArray<BlockContent>): boolean {
  return children.length > 1;
}

function normalizeListItem(item: ListItem): ListItem {
  const children = ensureListItemStartsWithParagraph(
    normalizeContainerChildren(item.children as BlockContent[]),
  ) as ListItem["children"];

  return {
    checked: typeof item.checked === "boolean" ? item.checked : null,
    children,
    spread: shouldSpreadListItem(children as BlockContent[]),
    type: "listItem",
  };
}

function normalizeAlign(value: unknown): AlignType | null {
  return value === "left" || value === "center" || value === "right" ? value : null;
}

function getColumnCount(rows: ReadonlyArray<TableRow>): number {
  return rows.reduce((max, row) => Math.max(max, row.children.length), 0);
}

function normalizeTableCell(cell: TableCell): TableCell {
  return {
    children: normalizeInlines(cell.children) as TableCell["children"],
    type: "tableCell",
  };
}

function normalizeTableRow(row: TableRow, columnCount: number): TableRow {
  const cells = row.children.map(normalizeTableCell);
  while (cells.length < columnCount) {
    cells.push({ children: [], type: "tableCell" });
  }
  return { children: cells.slice(0, columnCount), type: "tableRow" };
}

function normalizeTable(node: Table): Table[] {
  const columnCount = getColumnCount(node.children);
  if (node.children.length === 0 || columnCount === 0) return [];

  const align = Array.from({ length: columnCount }, (_, index) =>
    normalizeAlign((node.align ?? [])[index]),
  );
  return [
    {
      align,
      children: node.children.map((row) => normalizeTableRow(row, columnCount)),
      type: "table",
    },
  ];
}

function normalizeBlock(node: BlockContent): BlockContent[] {
  switch (node.type) {
    case "paragraph":
      return [{ children: normalizeInlines(node.children), type: "paragraph" }];
    case "heading":
      return [
        {
          children: normalizeInlines(node.children),
          depth: clampHeadingDepth(node.depth),
          type: "heading",
        },
      ];
    case "blockquote":
      return [
        {
          children: normalizeContainerChildren(node.children as BlockContent[]),
          type: "blockquote",
        },
      ];
    case "list": {
      const children = node.children.map(normalizeListItem);
      const spread = children.some((item) => item.spread);
      return children.length > 0
        ? [
            {
              children,
              ordered: node.ordered ?? false,
              spread,
              start: node.start ?? null,
              type: "list",
            },
          ]
        : [];
    }
    case "table":
      return normalizeTable(node);
    case "code":
      return [
        {
          lang: node.lang ?? null,
          meta: node.meta ?? null,
          type: "code",
          value: node.value,
        },
      ];
    case "thematicBreak":
      return [{ type: "thematicBreak" }];
    default:
      return [node];
  }
}

function isBlockContent(node: Root["children"][number]): node is BlockContent {
  return (
    node.type === "paragraph" ||
    node.type === "heading" ||
    node.type === "blockquote" ||
    node.type === "list" ||
    node.type === "table" ||
    node.type === "code" ||
    node.type === "thematicBreak" ||
    node.type === "html"
  );
}

export function normalizeMdast(root: Root): Root {
  const children: Root["children"] = [];
  for (const child of root.children) {
    if (isBlockContent(child)) {
      children.push(...normalizeBlock(child));
    } else {
      children.push(child);
    }
  }

  return {
    children: children.length > 0 ? children : [{ children: [], type: "paragraph" }],
    type: "root",
  };
}
