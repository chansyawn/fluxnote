import { expect } from "vite-plus/test";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown/processor";
import { mdastToSemanticDocument, semanticDocumentToMdast, type SemanticDocument } from "../model";
import { parseMarkdownWithShortcuts } from "./headless-editor-test-utils";

export function roundTripSemantic(markdown: string): {
  canonicalMarkdown: string;
  firstSemantic: SemanticDocument;
  secondSemantic: SemanticDocument;
} {
  const firstSemantic = mdastToSemanticDocument(parseMarkdownToMdast(markdown));
  const canonicalMarkdown = stringifyMdastToMarkdown(semanticDocumentToMdast(firstSemantic));
  const secondSemantic = mdastToSemanticDocument(parseMarkdownToMdast(canonicalMarkdown));

  return { canonicalMarkdown, firstSemantic, secondSemantic };
}

export function expectSemanticRoundTripStable(markdown: string) {
  const result = roundTripSemantic(markdown);
  expect(result.secondSemantic).toEqual(result.firstSemantic);
  return result;
}

export function expectMarkdownShortcut(markdown: string) {
  return expect(parseMarkdownWithShortcuts(markdown).children[0]);
}
