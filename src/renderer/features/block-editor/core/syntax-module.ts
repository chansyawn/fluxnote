import type { Transformer } from "@lexical/markdown";
import type { EditorThemeClasses, Klass, LexicalNode, TextFormatType } from "lexical";
import type { Content, Parent, Root } from "mdast";
import type { ComponentType } from "react";

export interface RawMarkdownMdastNode {
  type: "rawMarkdown";
  value: string;
  mdastType: string;
}

export type ExportedMdastNode = Content | RawMarkdownMdastNode;
export type MdastNode = Root | Content;

export interface ImportContext {
  sourceMarkdown: string;
  importNode: (node: MdastNode, formats?: ReadonlyArray<TextFormatType>) => LexicalNode[];
  importChildren: (node: Parent, formats?: ReadonlyArray<TextFormatType>) => LexicalNode[];
  importPhrasing: (
    children: ReadonlyArray<MdastNode>,
    formats?: ReadonlyArray<TextFormatType>,
  ) => LexicalNode[];
  getRawMarkdown: (node: MdastNode) => string;
}

export interface ExportContext {
  exportNode: (node: LexicalNode) => ExportedMdastNode[];
  exportChildren: (node: LexicalNode) => ExportedMdastNode[];
}

export type MdastImporter = (
  node: MdastNode,
  ctx: ImportContext,
  formats: ReadonlyArray<TextFormatType>,
) => LexicalNode[];

export type LexicalExporter = (node: LexicalNode, ctx: ExportContext) => ExportedMdastNode[];
export type SyntaxPluginComponent = ComponentType<Record<never, never>>;

export interface MarkdownSyntaxModule {
  name: string;
  lexicalNodes?: ReadonlyArray<Klass<LexicalNode>>;
  lexicalPlugins?: ReadonlyArray<SyntaxPluginComponent>;
  theme?: EditorThemeClasses;
  importMdast?: Readonly<Record<string, MdastImporter>>;
  exportMdast?: Readonly<Record<string, LexicalExporter>>;
  markdownTransformers?: ReadonlyArray<Transformer>;
}
