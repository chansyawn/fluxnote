import type {
  BlockContent,
  Break,
  Code,
  Delete,
  Emphasis,
  Heading,
  InlineCode,
  Link,
  List,
  ListContent,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Strong,
  Text,
} from "mdast";

import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown-processor";
import type {
  HeadingDepth,
  SemanticBlock,
  SemanticDocument,
  SemanticInline,
  SemanticListItem,
} from "./document";
import { normalizeSemanticDocument } from "./normalize";

function fallbackMarkdown(kind: string): string {
  return `<!-- unsupported:${kind} -->`;
}

function canonicalMarkdownForNode(node: RootContent): string {
  try {
    return stringifyMdastToMarkdown({ children: [node], type: "root" }).trim();
  } catch {
    return fallbackMarkdown(node.type);
  }
}

function canonicalMarkdownForInline(node: PhrasingContent): string {
  const paragraph: Paragraph = { children: [node], type: "paragraph" };
  return canonicalMarkdownForNode(paragraph).trim();
}

function isPhrasingContent(node: RootContent): node is PhrasingContent {
  return (
    node.type === "break" ||
    node.type === "delete" ||
    node.type === "emphasis" ||
    node.type === "footnoteReference" ||
    node.type === "html" ||
    node.type === "image" ||
    node.type === "imageReference" ||
    node.type === "inlineCode" ||
    node.type === "link" ||
    node.type === "linkReference" ||
    node.type === "strong" ||
    node.type === "text"
  );
}

function toHeadingDepth(depth: number): HeadingDepth {
  return Math.min(Math.max(Math.trunc(depth), 1), 6) as HeadingDepth;
}

function inlineFromMdast(node: PhrasingContent): SemanticInline[] {
  switch (node.type) {
    case "text":
      return [{ type: "text", value: node.value }];
    case "break":
      return [{ type: "hardBreak" }];
    case "emphasis":
      return [{ children: inlinesFromMdast(node.children), type: "emphasis" }];
    case "strong":
      return [{ children: inlinesFromMdast(node.children), type: "strong" }];
    case "delete":
      return [{ children: inlinesFromMdast(node.children), type: "delete" }];
    case "inlineCode":
      return [{ type: "inlineCode", value: node.value }];
    case "link":
      return [
        {
          children: inlinesFromMdast(node.children),
          title: node.title ?? null,
          type: "link",
          url: node.url,
        },
      ];
    default:
      return [
        {
          kind: node.type,
          markdown: canonicalMarkdownForInline(node),
          type: "opaqueInline",
        },
      ];
  }
}

function inlinesFromMdast(children: ReadonlyArray<PhrasingContent>): SemanticInline[] {
  return children.flatMap(inlineFromMdast);
}

function listItemFromMdast(node: ListItem): SemanticListItem {
  return {
    ...("checked" in node && typeof node.checked === "boolean" ? { checked: node.checked } : {}),
    children: blocksFromMdast(node.children),
    type: "listItem",
  };
}

function blockFromMdast(node: RootContent): SemanticBlock[] {
  switch (node.type) {
    case "paragraph":
      return [{ children: inlinesFromMdast(node.children), type: "paragraph" }];
    case "heading":
      return [
        {
          children: inlinesFromMdast(node.children),
          depth: toHeadingDepth(node.depth),
          type: "heading",
        },
      ];
    case "blockquote":
      return [{ children: blocksFromMdast(node.children), type: "blockquote" }];
    case "list":
      return [
        {
          children: node.children.map(listItemFromMdast),
          ordered: node.ordered === true,
          start: typeof node.start === "number" ? node.start : 1,
          type: "list",
        },
      ];
    case "listItem":
      return [listItemFromMdast(node)];
    case "code":
      return [{ lang: node.lang ?? null, type: "codeBlock", value: node.value }];
    case "thematicBreak":
      return [{ type: "thematicBreak" }];
    default:
      if (isPhrasingContent(node)) {
        return [{ children: inlineFromMdast(node), type: "paragraph" }];
      }

      return [
        {
          kind: node.type,
          markdown: canonicalMarkdownForNode(node),
          type: "opaqueBlock",
        },
      ];
  }
}

function blocksFromMdast(children: ReadonlyArray<RootContent>): SemanticBlock[] {
  return children.flatMap(blockFromMdast);
}

function inlineToMdast(node: SemanticInline): PhrasingContent[] {
  switch (node.type) {
    case "text":
      return [{ type: "text", value: node.value } satisfies Text];
    case "hardBreak":
      return [{ type: "break" } satisfies Break];
    case "emphasis":
      return [{ children: inlinesToMdast(node.children), type: "emphasis" } satisfies Emphasis];
    case "strong":
      return [{ children: inlinesToMdast(node.children), type: "strong" } satisfies Strong];
    case "delete":
      return [{ children: inlinesToMdast(node.children), type: "delete" } satisfies Delete];
    case "inlineCode":
      return [{ type: "inlineCode", value: node.value } satisfies InlineCode];
    case "link":
      return [
        {
          children: inlinesToMdast(node.children),
          title: node.title,
          type: "link",
          url: node.url,
        } satisfies Link,
      ];
    case "opaqueInline":
      return opaqueInlineToMdast(node.markdown);
  }
}

function inlinesToMdast(children: ReadonlyArray<SemanticInline>): PhrasingContent[] {
  return children.flatMap(inlineToMdast);
}

function opaqueInlineToMdast(markdown: string): PhrasingContent[] {
  const parsed = parseMarkdownToMdast(markdown);
  const first = parsed.children[0];

  if (first?.type === "paragraph") {
    return first.children;
  }

  if (first && isPhrasingContent(first)) {
    return [first];
  }

  return [{ type: "inlineCode", value: markdown.trim() }];
}

function opaqueBlockToMdast(markdown: string): BlockContent[] {
  const parsed = parseMarkdownToMdast(markdown);
  return parsed.children.filter((node): node is BlockContent => !isPhrasingContent(node));
}

function listItemToMdast(item: SemanticListItem): ListItem {
  return {
    checked: typeof item.checked === "boolean" ? item.checked : null,
    children: blocksToMdast(item.children),
    spread: item.children.length > 1,
    type: "listItem",
  };
}

function blockToMdast(node: SemanticBlock): BlockContent[] {
  switch (node.type) {
    case "paragraph":
      return [{ children: inlinesToMdast(node.children), type: "paragraph" } satisfies Paragraph];
    case "heading":
      return [
        {
          children: inlinesToMdast(node.children),
          depth: node.depth,
          type: "heading",
        } satisfies Heading,
      ];
    case "blockquote":
      return [{ children: blocksToMdast(node.children), type: "blockquote" }];
    case "list":
      return [
        {
          children: node.children.map(listItemToMdast) as ListContent[],
          ordered: node.ordered,
          spread: node.children.some((item) => item.children.length > 1),
          start: node.ordered ? 1 : null,
          type: "list",
        } satisfies List,
      ];
    case "listItem":
      return blocksToMdast(node.children);
    case "codeBlock":
      return [
        {
          lang: node.lang,
          meta: null,
          type: "code",
          value: node.value,
        } satisfies Code,
      ];
    case "thematicBreak":
      return [{ type: "thematicBreak" }];
    case "opaqueBlock": {
      const parsed = opaqueBlockToMdast(node.markdown);
      return parsed.length > 0
        ? parsed
        : [{ children: [{ type: "inlineCode", value: node.markdown }], type: "paragraph" }];
    }
  }
}

function blocksToMdast(children: ReadonlyArray<SemanticBlock>): BlockContent[] {
  return children.flatMap(blockToMdast);
}

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
