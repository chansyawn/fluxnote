import type {
  AlignType,
  Blockquote,
  BlockContent,
  Code,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
  TableRow,
  Text,
  ThematicBreak,
} from "mdast";

export function doc(...children: RootContent[]): Root {
  return { children, type: "root" };
}

export function t(value: string): Text {
  return { type: "text", value };
}

export function p(...children: PhrasingContent[]): Paragraph {
  return { children, type: "paragraph" };
}

export function h(depth: number, ...children: PhrasingContent[]): Heading {
  return { children, depth: depth as Heading["depth"], type: "heading" };
}

export function quote(...children: BlockContent[]): Blockquote {
  return { children, type: "blockquote" };
}

export function li(
  children: BlockContent[],
  options?: { checked?: boolean | null; spread?: boolean },
): ListItem {
  return {
    checked: options?.checked ?? null,
    children,
    spread: options?.spread ?? false,
    type: "listItem",
  };
}

export function ul(...items: ListItem[]): List {
  return {
    children: items,
    ordered: false,
    spread: items.some((item) => item.spread),
    start: null,
    type: "list",
  };
}

export function ol(...items: ListItem[]): List {
  return {
    children: items,
    ordered: true,
    spread: items.some((item) => item.spread),
    start: 1,
    type: "list",
  };
}

export function code(value: string, lang: string | null = null): Code {
  return { lang, meta: null, type: "code", value };
}

export function hr(): ThematicBreak {
  return { type: "thematicBreak" };
}

export function bold(...children: PhrasingContent[]): PhrasingContent {
  return { children, type: "strong" };
}

export function italic(...children: PhrasingContent[]): PhrasingContent {
  return { children, type: "emphasis" };
}

export function strike(...children: PhrasingContent[]): PhrasingContent {
  return { children, type: "delete" };
}

export function inlineCode(value: string): InlineCode {
  return { type: "inlineCode", value };
}

export function link(url: string, ...children: Link["children"]): Link {
  return { children, title: null, type: "link", url };
}

export function img(url: string, alt = "", title: string | null = null): Image {
  return { alt, title, type: "image", url };
}

export function tbl(align: ReadonlyArray<AlignType | null>, ...rows: TableRow[]): Table {
  return { align: [...align], children: rows, type: "table" };
}

export function tr(...cells: TableCell[]): TableRow {
  return { children: cells, type: "tableRow" };
}

export function td(...children: PhrasingContent[]): TableCell {
  return { children, type: "tableCell" };
}
