import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

const MARKDOWN_PARSER = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

const MARKDOWN_STRINGIFIER = unified().use(remarkGfm).use(remarkMath).use(remarkStringify, {
  bullet: "-",
  emphasis: "*",
  fences: true,
  incrementListMarker: true,
  rule: "-",
  ruleRepetition: 3,
  strong: "*",
});

export function parseMarkdownToMdast(markdown: string): Root {
  return MARKDOWN_PARSER.parse(markdown);
}

export function stringifyMdastToMarkdown(mdast: Root): string {
  return String(MARKDOWN_STRINGIFIER.stringify(mdast));
}
