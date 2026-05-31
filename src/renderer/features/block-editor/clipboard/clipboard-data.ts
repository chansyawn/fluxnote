import { collectImageAssetUrls } from "@shared/features/block-editor/asset-urls";

const IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\(\s*<?(assets:\/\/[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;
const FILE_IMAGE_MARKDOWN_PATTERN = /!\[[^\]]*]\(\s*<?(file:\/\/[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;
const DATA_IMAGE_MARKDOWN_PATTERN =
  /!\[[^\]]*]\(\s*<?(data:image\/(?:png|jpeg|webp|gif);base64,[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;
const ANY_DATA_IMAGE_MARKDOWN_PATTERN =
  /!\[[^\]]*]\(\s*<?(data:image\/[^;\s>)]+;base64,[^)\s>]+)>?\s*(?:"[^"]*")?\)/g;
const ASSET_URL_PATTERN = /assets:\/\/[^\s"'<>)]*/g;
const FILE_URL_PATTERN = /file:\/\/[^\s"'<>)]*/g;
const DATA_IMAGE_URL_PATTERN = /data:image\/(?:png|jpeg|webp|gif);base64,[^\s"'<>)]*/g;
const ANY_DATA_IMAGE_URL_PATTERN = /data:image\/[^;\s"'<>)]+;base64,[^\s"'<>)]*/g;
const DATA_IMAGE_URL_PARSE_PATTERN =
  /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

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

export function collectDataImageUrlsFromClipboardFormats(html: string, text: string): string[] {
  return Array.from(
    new Set([
      ...collectImageSources(html),
      ...collectUrls(text, DATA_IMAGE_URL_PATTERN),
      ...[...text.matchAll(DATA_IMAGE_MARKDOWN_PATTERN)].map((match) => match[1] ?? ""),
    ]),
  ).filter((url) => parseDataImageUrl(url) !== null);
}

export function collectAnyDataImageUrlsFromClipboardFormats(html: string, text: string): string[] {
  return Array.from(
    new Set([
      ...collectImageSources(html),
      ...collectUrls(text, ANY_DATA_IMAGE_URL_PATTERN),
      ...[...text.matchAll(ANY_DATA_IMAGE_MARKDOWN_PATTERN)].map((match) => match[1] ?? ""),
    ]),
  ).filter((url) => url.startsWith("data:image/"));
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

export function rewriteClipboardDataImageUrlsToAssets(
  data: { html: string; text: string },
  dataImageUrlMap: Map<string, string | null>,
): { html: string; text: string } {
  return {
    html: rewriteHtmlImageSources(data.html, (src) => {
      if (!src.startsWith("data:image/")) return src;
      return dataImageUrlMap.get(src) ?? "about:blank";
    }),
    text: rewriteMarkdownImageUrls(data.text, "data:image", dataImageUrlMap),
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

export interface DataImageAsset {
  dataBase64: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}

export function parseDataImageUrl(url: string): DataImageAsset | null {
  const match = DATA_IMAGE_URL_PARSE_PATTERN.exec(url);
  if (!match) return null;

  const mimeType = match[1];
  const dataBase64 = match[2];
  if (!isSupportedImageMimeType(mimeType) || !dataBase64) return null;

  return { dataBase64, mimeType };
}

export function isSupportedImageMimeType(mimeType: string): mimeType is DataImageAsset["mimeType"] {
  return (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  );
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
  scheme: "assets://" | "file://" | "data:image",
  urlMap: Map<string, string | null>,
): string {
  const pattern =
    scheme === "assets://"
      ? IMAGE_MARKDOWN_PATTERN
      : scheme === "file://"
        ? FILE_IMAGE_MARKDOWN_PATTERN
        : ANY_DATA_IMAGE_MARKDOWN_PATTERN;
  return markdown.replace(pattern, (imageMarkdown: string, url: string) => {
    const nextUrl = urlMap.get(url);
    if (!nextUrl) return ASSET_UNAVAILABLE_MARKDOWN;

    return imageMarkdown.replace(url, nextUrl);
  });
}
