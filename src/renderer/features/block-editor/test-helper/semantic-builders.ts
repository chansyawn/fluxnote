import type {
  HeadingDepth,
  SemanticBlock,
  SemanticBlockquote,
  SemanticDocument,
  SemanticInline,
  SemanticList,
  SemanticListItem,
  SemanticParagraph,
  SemanticTable,
  SemanticTableAlign,
  SemanticTableCell,
  SemanticTableRow,
} from "../model";

export function doc(...children: SemanticBlock[]): SemanticDocument {
  return { children, type: "root" };
}

export function text(value: string): SemanticInline {
  return { type: "text", value };
}

export function p(valueOrChildren: string | SemanticInline[]): SemanticParagraph {
  return {
    children: typeof valueOrChildren === "string" ? [text(valueOrChildren)] : valueOrChildren,
    type: "paragraph",
  };
}

export function heading(depth: HeadingDepth, valueOrChildren: string | SemanticInline[]) {
  return {
    children: typeof valueOrChildren === "string" ? [text(valueOrChildren)] : valueOrChildren,
    depth,
    type: "heading" as const,
  };
}

export function quote(...children: SemanticBlock[]): SemanticBlockquote {
  return { children, type: "blockquote" };
}

export function listItem(...children: SemanticBlock[]): SemanticListItem {
  return { children, type: "listItem" };
}

export function taskItem(checked: boolean, ...children: SemanticBlock[]): SemanticListItem {
  return { checked, children, type: "listItem" };
}

export function list(ordered: boolean, ...children: SemanticListItem[]): SemanticList {
  return { children, ordered, type: "list" };
}

export function cell(valueOrChildren: string | SemanticInline[] = []): SemanticTableCell {
  return {
    children: typeof valueOrChildren === "string" ? [text(valueOrChildren)] : valueOrChildren,
    type: "tableCell",
  };
}

export function row(...cells: SemanticTableCell[]): SemanticTableRow {
  return { cells, type: "tableRow" };
}

export function table(align: SemanticTableAlign[], ...rows: SemanticTableRow[]): SemanticTable {
  return { align, rows, type: "table" };
}
