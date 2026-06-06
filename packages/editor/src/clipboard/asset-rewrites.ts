import { withDOM } from "@lexical/headless/dom";
import type { Image, Root } from "mdast";

import { collectImageAssetUrls, getImageAssetUrl } from "../assets/asset-urls";
import { parseMarkdownToMdast, stringifyMdastToMarkdown } from "../markdown/processor";
import type { BlockEditorRuntime } from "../runtime/types";
import type { ClipboardSerializedNode } from "./clipboard-serialized-node";

export const UNAVAILABLE_IMAGE_URL = "Unavailable";

type ImportFileAssets = BlockEditorRuntime["assets"]["importFiles"];

export const collectClipboardAssetUrls = collectImageAssetUrls;

function isFileUrl(value: string): boolean {
  return value.startsWith("file://");
}

function toUniqueValues(values: ReadonlyArray<string>): string[] {
  return Array.from(new Set(values));
}

function unavailableImageNode(node: ClipboardSerializedNode): ClipboardSerializedNode {
  return {
    ...node,
    alt: "",
    src: UNAVAILABLE_IMAGE_URL,
    title: null,
  };
}

export function rewriteClipboardAssetsForExternalFormats(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
  assetUrlMap: Map<string, string>,
): ClipboardSerializedNode[] {
  return nodes.map((node) => {
    const assetUrl = getImageAssetUrl(node);
    const nextNode =
      assetUrl && !assetUrlMap.has(assetUrl)
        ? unavailableImageNode(node)
        : {
            ...node,
            ...(assetUrl ? { src: assetUrlMap.get(assetUrl) } : {}),
          };

    if (node.children) {
      nextNode.children = rewriteClipboardAssetsForExternalFormats(node.children, assetUrlMap);
    }

    return nextNode;
  });
}

async function importFileImageUrls(
  fileUrls: ReadonlyArray<string>,
  importFiles: ImportFileAssets,
): Promise<Map<string, string>> {
  const uniqueFileUrls = toUniqueValues(fileUrls.filter(isFileUrl));
  if (uniqueFileUrls.length === 0) {
    return new Map();
  }

  const result = await importFiles({
    files: uniqueFileUrls.map((fileUrl) => ({ fileUrl })),
  }).catch(() => ({ assets: [] }));
  return new Map(
    result.assets.flatMap((asset) =>
      asset.assetUrl ? [[asset.fileUrl, asset.assetUrl] as const] : [],
    ),
  );
}

function getHtmlImageFileUrls(html: string): string[] {
  return withDOM(() => {
    const document = globalThis.document.implementation.createHTMLDocument("");
    document.body.innerHTML = html;
    return Array.from(document.body.querySelectorAll("img"))
      .map((image) => image.getAttribute("src") ?? "")
      .filter(isFileUrl);
  });
}

export async function rewriteHtmlFileImageSources(
  html: string,
  importFiles: ImportFileAssets,
): Promise<string> {
  const fileUrls = getHtmlImageFileUrls(html);
  if (fileUrls.length === 0) {
    return html;
  }

  const assetUrlMap = await importFileImageUrls(fileUrls, importFiles);
  return withDOM(() => {
    const document = globalThis.document.implementation.createHTMLDocument("");
    document.body.innerHTML = html;

    for (const image of Array.from(document.body.querySelectorAll("img"))) {
      const src = image.getAttribute("src") ?? "";
      if (!isFileUrl(src)) {
        continue;
      }

      const assetUrl = assetUrlMap.get(src);
      image.setAttribute("src", assetUrl ?? UNAVAILABLE_IMAGE_URL);
      if (!assetUrl) {
        image.setAttribute("alt", "");
        image.removeAttribute("title");
      }
    }

    return document.body.innerHTML;
  });
}

function visitMarkdownImages(node: Root | Image, visitor: (image: Image) => void): void {
  if (node.type === "image") {
    visitor(node);
    return;
  }

  if ("children" in node) {
    node.children.forEach((child) => {
      if (child.type === "image" || "children" in child) {
        visitMarkdownImages(child as Root | Image, visitor);
      }
    });
  }
}

export async function rewriteMarkdownFileImageSources(
  markdown: string,
  importFiles: ImportFileAssets,
): Promise<string> {
  const mdast = parseMarkdownToMdast(markdown);
  const fileUrls: string[] = [];
  visitMarkdownImages(mdast, (image) => {
    if (isFileUrl(image.url)) {
      fileUrls.push(image.url);
    }
  });

  if (fileUrls.length === 0) {
    return markdown;
  }

  const assetUrlMap = await importFileImageUrls(fileUrls, importFiles);
  visitMarkdownImages(mdast, (image) => {
    if (!isFileUrl(image.url)) {
      return;
    }

    const assetUrl = assetUrlMap.get(image.url);
    image.url = assetUrl ?? UNAVAILABLE_IMAGE_URL;
    if (!assetUrl) {
      image.alt = "";
      image.title = null;
    }
  });

  return stringifyMdastToMarkdown(mdast);
}
