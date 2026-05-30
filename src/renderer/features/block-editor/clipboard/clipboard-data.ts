import type { Editor } from "@milkdown/kit/core";
import { editorViewCtx, serializerCtx } from "@milkdown/kit/core";
import { getHTML } from "@milkdown/kit/utils";
import { collectImageAssetUrls } from "@shared/features/block-editor/asset-urls";

import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "../core/types";
import { normalizeExternalMarkdown } from "../markdown/external-markdown";

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\(\s*<?(assets:\/\/[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;

export function collectMarkdownAssetUrls(markdown: string): string[] {
  return collectImageAssetUrls(
    [...markdown.matchAll(IMAGE_MARKDOWN_PATTERN)].map((match) => ({
      type: "image",
      url: match[1],
    })),
  );
}

export function rewriteHtmlAssetUrls(html: string, assetUrlMap: Map<string, string>): string {
  let nextHtml = html;

  for (const [assetUrl, fileUrl] of assetUrlMap) {
    nextHtml = nextHtml.replaceAll(assetUrl, fileUrl);
  }

  return nextHtml;
}

export function getImageFileUrlForNativeClipboard(
  markdown: string,
  assetUrlMap: Map<string, string>,
): string | undefined {
  const assetUrls = collectMarkdownAssetUrls(markdown);
  if (assetUrls.length !== 1) return undefined;
  return assetUrlMap.get(assetUrls[0]);
}

export function serializeMarkdown(editor: Editor): string {
  return editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const serializer = ctx.get(serializerCtx);
    return serializer(view.state.doc);
  });
}

export async function createBlockEditorClipboardData(
  editor: Editor,
  runtime: BlockEditorRuntime,
): Promise<BlockEditorClipboardWriteData> {
  const markdown = normalizeExternalMarkdown(serializeMarkdown(editor));
  const html = editor.action(getHTML());
  const assetUrls = collectMarkdownAssetUrls(markdown);
  const resolvedAssets =
    assetUrls.length > 0 ? await runtime.assets.resolve({ assetUrls }) : { assets: [] };
  const assetUrlMap = new Map(
    resolvedAssets.assets.map((asset) => [asset.assetUrl, asset.fileUrl] as const),
  );
  const imageFileUrl = getImageFileUrlForNativeClipboard(markdown, assetUrlMap);

  return {
    html: rewriteHtmlAssetUrls(html, assetUrlMap),
    ...(imageFileUrl ? { imageFileUrl } : {}),
    nodes: assetUrls.map((assetUrl) => ({ type: "image", url: assetUrl })),
    text: markdown,
  };
}
