import type { Root } from "mdast";
import type { Handle, Options as ToMarkdownOptions } from "mdast-util-to-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import { rawMarkdownHandler } from "./raw-markdown";

const parser = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

const stringifier = unified()
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkStringify, {
    bullet: "-",
    fences: true,
    rule: "-",
    handlers: {
      rawMarkdown: rawMarkdownHandler,
    } as Partial<Record<string, Handle>> as ToMarkdownOptions["handlers"],
  });

export function parseMarkdownToMdast(markdown: string): Root {
  return parser.parse(markdown);
}

export function stringifyMdastToMarkdown(mdast: Root): string {
  return String(stringifier.stringify(mdast));
}
