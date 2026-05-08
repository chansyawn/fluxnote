import type { Transformer } from "@lexical/markdown";
import type { AnyLexicalExtensionArgument, LexicalNode } from "lexical";
import type { BlockContent, PhrasingContent, RootContent } from "mdast";

import type { SemanticBlock, SemanticInline, SemanticListItem } from "../model";

type SemanticRegistrationType =
  | SemanticBlock["type"]
  | SemanticInline["type"]
  | SemanticListItem["type"]
  | "tableRow"
  | "tableCell";

export type SyntaxRegistrationId =
  | "break"
  | "code"
  | "heading"
  | "image"
  | "inline-mark"
  | "link"
  | "list"
  | "paragraph"
  | "placeholders"
  | "quote"
  | "table"
  | "thematic-break";

export interface SyntaxRegistration {
  id: SyntaxRegistrationId;
  extension: AnyLexicalExtensionArgument;
  lexical?: SyntaxLexicalRegistration;
  markdownShortcuts?: ReadonlyArray<Transformer>;
  mdast?: SyntaxMdastRegistration;
  semanticTypes?: ReadonlyArray<SemanticRegistrationType>;
  mdastTypes?: ReadonlyArray<string>;
  lexicalNodeNames?: ReadonlyArray<string>;
}

export interface SyntaxMdastContext {
  readBlocks: (children: ReadonlyArray<RootContent>) => SemanticBlock[];
  readInlines: (children: ReadonlyArray<PhrasingContent>) => SemanticInline[];
  writeBlocks: (children: ReadonlyArray<SemanticBlock>) => BlockContent[];
  writeInlines: (children: ReadonlyArray<SemanticInline>) => PhrasingContent[];
}

export interface SyntaxMdastRegistration {
  fromBlock?: (node: RootContent, context: SyntaxMdastContext) => SemanticBlock[] | null;
  fromInline?: (node: PhrasingContent, context: SyntaxMdastContext) => SemanticInline[] | null;
  toBlock?: (node: SemanticBlock, context: SyntaxMdastContext) => BlockContent[] | null;
  toInline?: (node: SemanticInline, context: SyntaxMdastContext) => PhrasingContent[] | null;
}

export interface SyntaxLexicalContext {
  readContainerChildren: (children: ReadonlyArray<LexicalNode>) => SemanticBlock[];
  readInlines: (children: ReadonlyArray<LexicalNode>) => SemanticInline[];
  readListItem: (node: LexicalNode) => SemanticListItem | null;
  writeBlock: (node: SemanticBlock) => LexicalNode[];
  writeInline: (node: SemanticInline) => LexicalNode[];
}

export interface SyntaxLexicalRegistration {
  fromBlock?: (node: LexicalNode, context: SyntaxLexicalContext) => SemanticBlock[] | null;
  fromInline?: (node: LexicalNode, context: SyntaxLexicalContext) => SemanticInline[] | null;
  fromListItem?: (node: LexicalNode, context: SyntaxLexicalContext) => SemanticListItem | null;
  toBlock?: (node: SemanticBlock, context: SyntaxLexicalContext) => LexicalNode[] | null;
  toInline?: (node: SemanticInline, context: SyntaxLexicalContext) => LexicalNode[] | null;
}
