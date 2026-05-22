import { expect } from "vite-plus/test";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown/processor";
import { editorFromMarkdown, readMarkdown } from "./editor-driver";

/**
 * Verifies that converting markdown → editor → markdown is stable. The output
 * may be normalized but must round-trip on the second pass.
 */
export function expectMarkdownRoundTripStable(markdown: string): void {
  const editor = editorFromMarkdown(markdown);
  const first = readMarkdown(editor);
  const second = readMarkdown(editorFromMarkdown(first));
  expect(second).toBe(first);
}

/**
 * Verifies markdown → mdast → markdown is stable across the processor pipeline.
 */
export function expectMarkdownProcessorStable(markdown: string): void {
  const first = stringifyMdastToMarkdown(parseMarkdownToMdast(markdown));
  const second = stringifyMdastToMarkdown(parseMarkdownToMdast(first));
  expect(second).toBe(first);
}
