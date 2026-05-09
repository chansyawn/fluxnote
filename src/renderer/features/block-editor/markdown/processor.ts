import type { ListItem, Root } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import { escapeIsolatedGfmTaskMarkers } from "./gfm-compat";

// remark-stringify cannot emit a bare `- [ ]` line for a task item with no
// payload — it omits the checkbox entirely. We inject a non-breaking space as
// a placeholder during stringify and strip it back out from the resulting
// string. The placeholder lives only in a copied subtree; the input mdast is
// never mutated.
const EMPTY_TASK_ITEM_PLACEHOLDER = " ";

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

function isEmptyTaskItem(item: ListItem): boolean {
  if (typeof item.checked !== "boolean") return false;
  return item.children.every((child) => child.type === "paragraph" && child.children.length === 0);
}

function withTaskItemPlaceholders<T>(node: T): T {
  if (!node || typeof node !== "object") return node;

  const candidate = node as { type?: string; children?: unknown };

  if (candidate.type === "listItem" && isEmptyTaskItem(node as unknown as ListItem)) {
    return {
      ...candidate,
      children: [
        {
          children: [{ type: "text", value: EMPTY_TASK_ITEM_PLACEHOLDER }],
          type: "paragraph",
        },
      ],
    } as T;
  }

  if (Array.isArray(candidate.children)) {
    return {
      ...candidate,
      children: candidate.children.map((child) => withTaskItemPlaceholders(child)),
    } as T;
  }

  return node;
}

export function parseMarkdownToMdast(markdown: string): Root {
  return MARKDOWN_PARSER.parse(escapeIsolatedGfmTaskMarkers(markdown));
}

export function stringifyMdastToMarkdown(mdast: Root): string {
  const prepared = withTaskItemPlaceholders(mdast);
  return String(MARKDOWN_STRINGIFIER.stringify(prepared))
    .replace(new RegExp(`^(\\s*[-*+] \\[[ x]\\]) ${EMPTY_TASK_ITEM_PLACEHOLDER}$`, "gm"), "$1")
    .replace(/^(\s*)\* (\[[ x]\] )/gm, "$1- $2");
}
