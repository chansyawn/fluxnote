import type { Editor } from "@milkdown/kit/core";
import { editorViewCtx, serializerCtx } from "@milkdown/kit/core";
import { collectImageAssetUrls } from "@shared/features/block-editor/asset-urls";

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\(\s*<?(assets:\/\/[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;
const FILE_IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\(\s*<?(file:\/\/[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;
const ASSET_URL_PATTERN = /assets:\/\/[^\s"'<>)]*/g;
const FILE_URL_PATTERN = /file:\/\/[^\s"'<>)]*/g;

export const ASSET_UNAVAILABLE_MARKDOWN = '![Asset unavailable](about:blank "Asset unavailable")';
export const ASSET_UNAVAILABLE_HTML =
  '<img src="about:blank" alt="Asset unavailable" title="Asset unavailable">';

export function collectMarkdownAssetUrls(markdown: string): string[] {
  return collectImageAssetUrls(
    [...markdown.matchAll(IMAGE_MARKDOWN_PATTERN)].map((match) => ({
      type: "image",
      url: match[1],
    })),
  );
}

export function rewriteHtmlAssetUrls(html: string, assetUrlMap: Map<string, string>): string {
  return rewriteHtmlImageSources(html, (src) =>
    src.startsWith("assets://") ? (assetUrlMap.get(src) ?? "about:blank") : src,
  );
}

export function collectAssetUrlsFromClipboardFormats(html: string, text: string): string[] {
  return Array.from(
    new Set([...collectImageSources(html), ...collectUrls(text, ASSET_URL_PATTERN)]),
  ).filter((url) => url.startsWith("assets://"));
}

export function collectFileUrlsFromClipboardFormats(html: string, text: string): string[] {
  return Array.from(
    new Set([
      ...collectImageSources(html),
      ...collectUrls(text, FILE_URL_PATTERN),
      ...[...text.matchAll(FILE_IMAGE_MARKDOWN_PATTERN)].map((match) => match[1] ?? ""),
    ]),
  ).filter((url) => url.startsWith("file://"));
}

export function rewriteClipboardAssetUrlsToFiles(
  data: { html: string; text: string },
  assetUrlMap: Map<string, string>,
): { html: string; text: string } {
  return {
    html: rewriteHtmlImageSources(data.html, (src) => {
      if (!src.startsWith("assets://")) return src;
      return assetUrlMap.get(src) ?? "about:blank";
    }),
    text: rewriteMarkdownImageUrls(data.text, "assets://", assetUrlMap),
  };
}

export function rewriteClipboardFileUrlsToAssets(
  data: { html: string; text: string },
  fileUrlMap: Map<string, string | null>,
): { html: string; text: string } {
  return {
    html: rewriteHtmlImageSources(data.html, (src) => {
      if (!src.startsWith("file://")) return src;
      return fileUrlMap.get(src) ?? "about:blank";
    }),
    text: rewriteMarkdownImageUrls(data.text, "file://", fileUrlMap),
  };
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

function collectUrls(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0]);
}

function collectImageSources(html: string): string[] {
  if (!html) return [];

  const document = new DOMParser().parseFromString(html, "text/html");
  return Array.from(document.images, (image) => image.getAttribute("src") ?? "").filter(Boolean);
}

function rewriteHtmlImageSources(html: string, rewrite: (src: string) => string): string {
  if (!html) return html;

  const document = new DOMParser().parseFromString(html, "text/html");
  for (const image of Array.from(document.images)) {
    const src = image.getAttribute("src");
    if (!src) continue;

    const nextSrc = rewrite(src);
    if (nextSrc === "about:blank") {
      image.setAttribute("src", "about:blank");
      image.setAttribute("alt", "Asset unavailable");
      image.setAttribute("title", "Asset unavailable");
      continue;
    }

    image.setAttribute("src", nextSrc);
  }

  return document.body.innerHTML;
}

function rewriteMarkdownImageUrls(
  markdown: string,
  scheme: "assets://" | "file://",
  urlMap: Map<string, string | null>,
): string {
  const pattern = scheme === "assets://" ? IMAGE_MARKDOWN_PATTERN : FILE_IMAGE_MARKDOWN_PATTERN;
  return markdown.replace(pattern, (imageMarkdown: string, url: string) => {
    const nextUrl = urlMap.get(url);
    if (!nextUrl) return ASSET_UNAVAILABLE_MARKDOWN;

    return imageMarkdown.replace(url, nextUrl);
  });
}
