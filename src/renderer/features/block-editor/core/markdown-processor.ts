import type { Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

const stringifier = unified().use(remarkGfm).use(remarkMath).use(remarkStringify, {
  bullet: "-",
  emphasis: "*",
  fences: true,
  incrementListMarker: false,
  rule: "-",
  ruleRepetition: 3,
  strong: "*",
});

export function parseMarkdownToMdast(markdown: string): Root {
  return parser.parse(markdown);
}

export function stringifyMdastToMarkdown(mdast: Root): string {
  return String(stringifier.stringify(mdast));
}
