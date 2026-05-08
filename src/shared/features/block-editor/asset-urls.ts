import type { ClipboardSerializedNode } from "./clipboard";

export interface ImageUrlNode {
  children?: ImageUrlNode[];
  src?: unknown;
  type?: string;
  url?: unknown;
}

export function getImageAssetUrl(node: ImageUrlNode): string | null {
  if (node.type !== "image") {
    return null;
  }

  const url = typeof node.src === "string" ? node.src : node.url;
  return typeof url === "string" && url.startsWith("assets://") ? url : null;
}

export function collectImageAssetUrls(nodes: ReadonlyArray<ImageUrlNode>): string[] {
  const assetUrls = new Set<string>();

  const visit = (node: ImageUrlNode): void => {
    const assetUrl = getImageAssetUrl(node);
    if (assetUrl) {
      assetUrls.add(assetUrl);
    }

    node.children?.forEach(visit);
  };

  nodes.forEach(visit);
  return Array.from(assetUrls);
}

export function rewriteClipboardImageAssetUrls(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
  assetUrlMap: Map<string, string>,
): ClipboardSerializedNode[] {
  return nodes.map((node) => {
    const nextNode: ClipboardSerializedNode = { ...node };
    const assetUrl = getImageAssetUrl(node);
    if (assetUrl) {
      nextNode.src = assetUrlMap.get(assetUrl) ?? assetUrl;
    }

    if (node.children) {
      nextNode.children = rewriteClipboardImageAssetUrls(node.children, assetUrlMap);
    }

    return nextNode;
  });
}
