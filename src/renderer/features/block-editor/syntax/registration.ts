import type { Transformer } from "@lexical/markdown";
import type { EditorThemeClasses, LexicalNodeConfig } from "lexical";
import type { ReactNode } from "react";

import type { SemanticBlock, SemanticInline, SemanticListItem } from "../model";

export type SyntaxRegistrationId =
  | "break"
  | "code"
  | "heading"
  | "inline-mark"
  | "link"
  | "list"
  | "paragraph"
  | "placeholders"
  | "quote"
  | "thematic-break";

export interface SyntaxRegistration {
  id: SyntaxRegistrationId;
  nodes?: ReadonlyArray<LexicalNodeConfig>;
  markdownShortcuts?: ReadonlyArray<Transformer>;
  runtimePlugins?: (context: SyntaxRuntimeContext) => ReactNode[];
  theme?: Partial<EditorThemeClasses>;
  semanticTypes?: ReadonlyArray<
    SemanticBlock["type"] | SemanticInline["type"] | SemanticListItem["type"]
  >;
  mdastTypes?: ReadonlyArray<string>;
  lexicalNodeNames?: ReadonlyArray<string>;
}

export interface SyntaxRuntimeContext {
  markdownShortcuts: ReadonlyArray<Transformer>;
}
