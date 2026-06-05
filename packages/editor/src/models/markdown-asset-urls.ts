import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Position } from "unist";

import { collectImageAssetUrls, getImageAssetUrl, type ImageUrlNode } from "./asset-urls";

interface MarkdownNode extends ImageUrlNode {
  children?: MarkdownNode[];
  position?: Position;
}

interface MarkdownImageReplacement {
  endOffset: number;
  nextUrl: string;
  startOffset: number;
}

const MARKDOWN_PARSER = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const MARKDOWN_IMAGE_DESTINATION_PREFIX_PATTERN = /]\(\s*<?$/;

export function collectMarkdownImageAssetUrls(content: string): string[] {
  const tree = MARKDOWN_PARSER.parse(content) as MarkdownNode;
  return collectImageAssetUrls([tree]);
}

export function replaceMarkdownImageAssetUrls(
  content: string,
  assetUrlMap: ReadonlyMap<string, string>,
): string {
  const replacements = collectMarkdownImageReplacements(content, assetUrlMap);
  let nextContent = content;

  for (const replacement of replacements.toSorted((a, b) => b.startOffset - a.startOffset)) {
    const before = nextContent.slice(0, replacement.startOffset);
    const after = nextContent.slice(replacement.endOffset);
    nextContent = `${before}${replacement.nextUrl}${after}`;
  }

  return nextContent;
}

function collectMarkdownImageReplacements(
  content: string,
  assetUrlMap: ReadonlyMap<string, string>,
): MarkdownImageReplacement[] {
  const tree = MARKDOWN_PARSER.parse(content) as MarkdownNode;
  const replacements: MarkdownImageReplacement[] = [];

  const visit = (node: MarkdownNode): void => {
    const assetUrl = getImageAssetUrl(node);
    if (assetUrl) {
      const nextUrl = assetUrlMap.get(assetUrl);
      const urlRange = nextUrl ? findMarkdownImageUrlRange(content, node, assetUrl) : null;
      if (nextUrl && urlRange) {
        replacements.push({
          endOffset: urlRange.endOffset,
          nextUrl,
          startOffset: urlRange.startOffset,
        });
      }
    }

    node.children?.forEach(visit);
  };

  visit(tree);
  return replacements;
}

function findMarkdownImageUrlRange(
  content: string,
  node: MarkdownNode,
  assetUrl: string,
): Pick<MarkdownImageReplacement, "endOffset" | "startOffset"> | null {
  const nodeStartOffset = node.position?.start.offset;
  const nodeEndOffset = node.position?.end.offset;
  if (
    typeof nodeStartOffset !== "number" ||
    typeof nodeEndOffset !== "number" ||
    nodeStartOffset >= nodeEndOffset
  ) {
    return null;
  }

  const nodeMarkdown = content.slice(nodeStartOffset, nodeEndOffset);
  let searchFrom = 0;

  while (searchFrom < nodeMarkdown.length) {
    const relativeUrlStart = nodeMarkdown.indexOf(assetUrl, searchFrom);
    if (relativeUrlStart === -1) {
      return null;
    }

    const beforeUrl = nodeMarkdown.slice(0, relativeUrlStart);
    if (MARKDOWN_IMAGE_DESTINATION_PREFIX_PATTERN.test(beforeUrl)) {
      return {
        endOffset: nodeStartOffset + relativeUrlStart + assetUrl.length,
        startOffset: nodeStartOffset + relativeUrlStart,
      };
    }

    searchFrom = relativeUrlStart + assetUrl.length;
  }

  return null;
}
