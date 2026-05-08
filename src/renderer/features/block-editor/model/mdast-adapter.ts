import type { BlockContent, PhrasingContent, Root, RootContent, Text } from "mdast";

import type { SyntaxMdastContext } from "../syntax/registration";
import { SYNTAX_REGISTRATIONS } from "../syntax/registry";
import type { SemanticBlock, SemanticDocument, SemanticInline } from "./document";
import { normalizeSemanticDocument } from "./normalize";

function textFromMdast(value: string): SemanticInline[] {
  const parts = value.split("\n");
  const inlines: SemanticInline[] = [];

  parts.forEach((part, index) => {
    if (index > 0) {
      inlines.push({ type: "softBreak" });
    }

    if (part.length > 0) {
      inlines.push({ type: "text", value: part });
    }
  });

  return inlines;
}

function inlineFromMdast(node: PhrasingContent): SemanticInline[] {
  if (node.type === "text") {
    return textFromMdast(node.value);
  }

  for (const syntax of SYNTAX_REGISTRATIONS) {
    const semantic = syntax.mdast?.fromInline?.(node, mdastContext);
    if (semantic !== undefined && semantic !== null) {
      return semantic;
    }
  }

  return [];
}

function inlinesFromMdast(children: ReadonlyArray<PhrasingContent>): SemanticInline[] {
  return children.flatMap(inlineFromMdast);
}

function blockFromMdast(node: RootContent): SemanticBlock[] {
  if (node.type === "listItem") {
    return [];
  }

  for (const syntax of SYNTAX_REGISTRATIONS) {
    const semantic = syntax.mdast?.fromBlock?.(node, mdastContext);
    if (semantic !== undefined && semantic !== null) {
      return semantic;
    }
  }

  return [];
}

function blocksFromMdast(children: ReadonlyArray<RootContent>): SemanticBlock[] {
  return children.flatMap(blockFromMdast);
}

function inlineToMdast(node: SemanticInline): PhrasingContent[] {
  if (node.type === "text") {
    return [{ type: "text", value: node.value } satisfies Text];
  }

  for (const syntax of SYNTAX_REGISTRATIONS) {
    const mdast = syntax.mdast?.toInline?.(node, mdastContext);
    if (mdast !== undefined && mdast !== null) {
      return mdast;
    }
  }

  return [];
}

function inlinesToMdast(children: ReadonlyArray<SemanticInline>): PhrasingContent[] {
  return children.flatMap(inlineToMdast);
}

function blockToMdast(node: SemanticBlock): BlockContent[] {
  for (const syntax of SYNTAX_REGISTRATIONS) {
    const mdast = syntax.mdast?.toBlock?.(node, mdastContext);
    if (mdast !== undefined && mdast !== null) {
      return mdast;
    }
  }

  return [];
}

function blocksToMdast(children: ReadonlyArray<SemanticBlock>): BlockContent[] {
  return children.flatMap(blockToMdast);
}

const mdastContext: SyntaxMdastContext = {
  readBlocks: blocksFromMdast,
  readInlines: inlinesFromMdast,
  writeBlocks: blocksToMdast,
  writeInlines: inlinesToMdast,
};

export function mdastToSemanticDocument(root: Root): SemanticDocument {
  return normalizeSemanticDocument({
    children: blocksFromMdast(root.children),
    type: "root",
  });
}

export function semanticDocumentToMdast(document: SemanticDocument): Root {
  const normalized = normalizeSemanticDocument(document);
  return {
    children: blocksToMdast(normalized.children),
    type: "root",
  };
}
