import type { Transformer } from "@lexical/markdown";
import type { EditorThemeClasses, LexicalNodeConfig } from "lexical";
import type { ReactNode } from "react";

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
import type {
  SyntaxRegistration,
  SyntaxRegistrationId,
  SyntaxRuntimeContext,
} from "./registration";
import { THEMATIC_BREAK_SYNTAX } from "./thematic-break";

const SYNTAX_REGISTRY: ReadonlyArray<SyntaxRegistration> = [
  BREAK_SYNTAX,
  HEADING_SYNTAX,
  QUOTE_SYNTAX,
  LIST_SYNTAX,
  THEMATIC_BREAK_SYNTAX,
  CODE_SYNTAX,
  INLINE_MARK_SYNTAX,
  IMAGE_SYNTAX,
  LINK_SYNTAX,
  PARAGRAPH_SYNTAX,
  PLACEHOLDERS_SYNTAX,
] satisfies ReadonlyArray<SyntaxRegistration>;

const SYNTAX_NODE_REGISTRATION_ORDER = [
  "break",
  "code",
  "thematic-break",
  "heading",
  "image",
  "link",
  "list",
  "quote",
  "placeholders",
] satisfies ReadonlyArray<SyntaxRegistrationId>;

function getSyntaxRegistration(id: SyntaxRegistrationId): SyntaxRegistration {
  const registration = SYNTAX_REGISTRY.find((syntax) => syntax.id === id);
  if (!registration) {
    throw new Error(`Unknown block editor syntax registration: ${id}`);
  }

  return registration;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeRecord(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(source)) {
    const current = target[key];
    if (isPlainRecord(current) && isPlainRecord(value)) {
      mergeRecord(current, value);
    } else {
      target[key] = value;
    }
  }
}

function mergeThemeFragments(registrations: ReadonlyArray<SyntaxRegistration>): EditorThemeClasses {
  const theme: Record<string, unknown> = {};

  for (const registration of registrations) {
    if (registration.theme) {
      mergeRecord(theme, registration.theme as Record<string, unknown>);
    }
  }

  return theme as EditorThemeClasses;
}

export const SYNTAX_REGISTRATIONS = SYNTAX_REGISTRY;

export const SYNTAX_NODES: ReadonlyArray<LexicalNodeConfig> =
  SYNTAX_NODE_REGISTRATION_ORDER.flatMap((id): LexicalNodeConfig[] =>
    Array.from(getSyntaxRegistration(id).nodes ?? []),
  );

export const MARKDOWN_SHORTCUT_TRANSFORMERS: Transformer[] = SYNTAX_REGISTRY.flatMap(
  (syntax): Transformer[] => Array.from(syntax.markdownShortcuts ?? []),
);

export function createSyntaxRuntimePlugins(
  context: Omit<SyntaxRuntimeContext, "markdownShortcuts">,
): ReadonlyArray<ReactNode> {
  return SYNTAX_REGISTRY.flatMap(
    (syntax): ReactNode[] =>
      syntax.runtimePlugins?.({
        ...context,
        markdownShortcuts: MARKDOWN_SHORTCUT_TRANSFORMERS,
      }) ?? [],
  );
}

export const SYNTAX_THEME: EditorThemeClasses = mergeThemeFragments(SYNTAX_REGISTRY);

export const SYNTAX_SEMANTIC_TYPES = SYNTAX_REGISTRY.flatMap((syntax): string[] =>
  Array.from(syntax.semanticTypes ?? []),
);

export const SYNTAX_MDAST_TYPES = SYNTAX_REGISTRY.flatMap((syntax): string[] =>
  Array.from(syntax.mdastTypes ?? []),
);

export const SYNTAX_LEXICAL_NODE_NAMES = SYNTAX_NODE_REGISTRATION_ORDER.flatMap((id): string[] =>
  Array.from(getSyntaxRegistration(id).lexicalNodeNames ?? []),
);
