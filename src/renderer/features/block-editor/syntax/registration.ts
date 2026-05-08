import type { Transformer } from "@lexical/markdown";
import type { EditorThemeClasses, LexicalNodeConfig } from "lexical";
import type { ReactNode } from "react";

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
  nodes?: ReadonlyArray<LexicalNodeConfig>;
  markdownShortcuts?: ReadonlyArray<Transformer>;
  runtimePlugins?: (context: SyntaxRuntimeContext) => ReactNode[];
  theme?: Partial<EditorThemeClasses>;
  semanticTypes?: ReadonlyArray<SemanticRegistrationType>;
  mdastTypes?: ReadonlyArray<string>;
  lexicalNodeNames?: ReadonlyArray<string>;
}

export interface SyntaxRuntimeContext {
  blockId: string;
  markdownShortcuts: ReadonlyArray<Transformer>;
}
