/**
 * SemanticDocument is the fidelity boundary for the block editor. It captures
 * Markdown meaning shared by mdast and Lexical, rather than preserving the exact
 * original Markdown source layout.
 */
export interface SemanticDocument {
  type: "root";
  children: SemanticBlock[];
}

export type HeadingDepth = 1 | 2 | 3 | 4 | 5 | 6;

export type SemanticBlock =
  | SemanticParagraph
  | SemanticHeading
  | SemanticBlockquote
  | SemanticList
  | SemanticTable
  | SemanticCodeBlock
  | SemanticThematicBreak
  | SemanticOpaqueBlock;

export interface SemanticParagraph {
  type: "paragraph";
  children: SemanticInline[];
}

export interface SemanticHeading {
  type: "heading";
  depth: HeadingDepth;
  children: SemanticInline[];
}

export interface SemanticBlockquote {
  type: "blockquote";
  children: SemanticBlock[];
}

export interface SemanticList {
  type: "list";
  ordered: boolean;
  children: SemanticListItem[];
}

export interface SemanticListItem {
  type: "listItem";
  checked?: boolean;
  children: SemanticBlock[];
}

export type SemanticTableAlign = "left" | "center" | "right" | null;

export interface SemanticTable {
  type: "table";
  align: SemanticTableAlign[];
  rows: SemanticTableRow[];
}

export interface SemanticTableRow {
  type: "tableRow";
  cells: SemanticTableCell[];
}

export interface SemanticTableCell {
  type: "tableCell";
  children: SemanticInline[];
}

export interface SemanticCodeBlock {
  type: "codeBlock";
  lang: string | null;
  value: string;
}

export interface SemanticThematicBreak {
  type: "thematicBreak";
}

export interface SemanticOpaqueBlock {
  type: "opaqueBlock";
  kind: string;
  markdown: string;
  metadata?: Record<string, unknown>;
}

export type SemanticInline =
  | SemanticText
  | SemanticEmphasis
  | SemanticStrong
  | SemanticDelete
  | SemanticInlineCode
  | SemanticLink
  | SemanticImage
  | SemanticSoftBreak
  | SemanticHardBreak
  | SemanticOpaqueInline;

export interface SemanticText {
  type: "text";
  value: string;
}

export interface SemanticEmphasis {
  type: "emphasis";
  children: SemanticInline[];
}

export interface SemanticStrong {
  type: "strong";
  children: SemanticInline[];
}

export interface SemanticDelete {
  type: "delete";
  children: SemanticInline[];
}

export interface SemanticInlineCode {
  type: "inlineCode";
  value: string;
}

export interface SemanticLink {
  type: "link";
  url: string;
  title: string | null;
  children: SemanticInline[];
}

export interface SemanticImage {
  type: "image";
  url: string;
  alt: string;
  title: string | null;
}

export interface SemanticSoftBreak {
  type: "softBreak";
}

export interface SemanticHardBreak {
  type: "hardBreak";
}

export interface SemanticOpaqueInline {
  type: "opaqueInline";
  kind: string;
  markdown: string;
  metadata?: Record<string, unknown>;
}

export function createEmptyDocument(): SemanticDocument {
  return {
    children: [{ children: [], type: "paragraph" }],
    type: "root",
  };
}
