import type { Transformer } from "@lexical/markdown";
import type { AnyLexicalExtensionArgument } from "lexical";

import { BREAK_SYNTAX } from "./break";
import { CODE_SYNTAX } from "./code";
import { HEADING_SYNTAX } from "./heading";
import { IMAGE_SYNTAX } from "./image";
import { INLINE_MARK_SYNTAX } from "./inline-mark";
import { LINK_SYNTAX } from "./link";
import { LIST_SYNTAX } from "./list";
import { PARAGRAPH_SYNTAX } from "./paragraph";
import { PLACEHOLDERS_SYNTAX } from "./placeholders";
import { QUOTE_SYNTAX } from "./quote";
import type { SyntaxRegistration } from "./registration";
import { TABLE_SYNTAX } from "./table";
import { THEMATIC_BREAK_SYNTAX } from "./thematic-break";

const SYNTAX_REGISTRY: ReadonlyArray<SyntaxRegistration> = [
  BREAK_SYNTAX,
  HEADING_SYNTAX,
  QUOTE_SYNTAX,
  LIST_SYNTAX,
  TABLE_SYNTAX,
  THEMATIC_BREAK_SYNTAX,
  CODE_SYNTAX,
  INLINE_MARK_SYNTAX,
  IMAGE_SYNTAX,
  LINK_SYNTAX,
  PARAGRAPH_SYNTAX,
  PLACEHOLDERS_SYNTAX,
] satisfies ReadonlyArray<SyntaxRegistration>;

export const SYNTAX_REGISTRATIONS = SYNTAX_REGISTRY;

export const SYNTAX_EXTENSIONS: ReadonlyArray<AnyLexicalExtensionArgument> =
  SYNTAX_REGISTRY.flatMap((syntax) => Array.from(syntax.extensions));

export const SYNTAX_REACT_EXTENSIONS: ReadonlyArray<AnyLexicalExtensionArgument> =
  SYNTAX_REGISTRY.flatMap((syntax) => Array.from(syntax.reactExtensions ?? []));

export const SYNTAX_MARKDOWN_SHORTCUTS: ReadonlyArray<Transformer> = SYNTAX_REGISTRY.flatMap(
  (syntax) => Array.from(syntax.markdownShortcuts ?? []),
);

export const SYNTAX_SEMANTIC_TYPES = SYNTAX_REGISTRY.flatMap((syntax): string[] =>
  Array.from(syntax.semanticTypes ?? []),
);

export const SYNTAX_MDAST_TYPES = SYNTAX_REGISTRY.flatMap((syntax): string[] =>
  Array.from(syntax.mdastTypes ?? []),
);

export const SYNTAX_LEXICAL_NODE_NAMES = SYNTAX_REGISTRY.flatMap((syntax): string[] =>
  Array.from(syntax.lexicalNodeNames ?? []),
);
