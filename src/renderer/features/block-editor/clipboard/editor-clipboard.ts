import type { Editor } from "@milkdown/kit/core";
import { editorViewCtx, parserCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import { DOMParser, Slice } from "@milkdown/kit/prose/model";
import { AllSelection, Plugin } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

import type { BlockEditorRuntime } from "../core/types";
import {
  ASSET_UNAVAILABLE_HTML,
  ASSET_UNAVAILABLE_MARKDOWN,
  collectAnyDataImageUrlsFromClipboardFormats,
  collectAssetUrlsFromClipboardFormats,
  collectDataImageUrlsFromClipboardFormats,
  collectFileUrlsFromClipboardFormats,
  isSupportedImageMimeType,
  parseDataImageUrl,
  rewriteClipboardAssetUrlsToFiles,
  rewriteClipboardDataImageUrlsToAssets,
  rewriteClipboardFileUrlsToAssets,
} from "./clipboard-data";

interface ClipboardFormats {
  html: string;
  text: string;
}

interface CreatedClipboardAsset {
  altText: string;
  assetUrl: string | null;
}

function getFileNameFromUrl(fileUrl: string): string | undefined {
  try {
    const url = new URL(fileUrl);
    const fileName = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) ?? "");
    return fileName || undefined;
  } catch {
    return undefined;
  }
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function hasClipboardImageFiles(event: ClipboardEvent): boolean {
  const items = event.clipboardData?.items;
  if (!items) return false;

  return Array.from(items).some(
    (item) => item.kind === "file" && isSupportedImageMimeType(item.type),
  );
}

function collectClipboardImageFiles(event: ClipboardEvent): File[] {
  const items = event.clipboardData?.items;
  if (!items) return [];

  return Array.from(items).flatMap((item) => {
    if (item.kind !== "file" || !isSupportedImageMimeType(item.type)) return [];

    const file = item.getAsFile();
    return file ? [file] : [];
  });
}

async function readClipboardImageFile(file: File): Promise<{
  dataBase64: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
}> {
  if (!isSupportedImageMimeType(file.type)) {
    throw new Error("Unsupported clipboard image type.");
  }

  return {
    dataBase64: bytesToBase64(new Uint8Array(await file.arrayBuffer())),
    mimeType: file.type,
  };
}

async function resolveClipboardAssets(
  runtime: BlockEditorRuntime,
  formats: ClipboardFormats,
): Promise<Map<string, string>> {
  const assetUrls = collectAssetUrlsFromClipboardFormats(formats.html, formats.text);
  if (assetUrls.length === 0) return new Map();

  try {
    const resolved = await runtime.assets.resolve({ assetUrls });
    return new Map(resolved.assets.map((asset) => [asset.assetUrl, asset.fileUrl]));
  } catch {
    return new Map();
  }
}

async function createClipboardDataImageAssets(
  runtime: BlockEditorRuntime,
  dataImageUrls: string[],
): Promise<Map<string, string | null>> {
  const inputs = dataImageUrls.flatMap((dataImageUrl) => {
    const parsed = parseDataImageUrl(dataImageUrl);
    return parsed ? [{ dataImageUrl, parsed }] : [];
  });
  if (inputs.length === 0) return new Map();

  try {
    const result = await runtime.assets.create({
      assets: inputs.map(({ parsed }) => parsed),
    });

    return new Map(
      inputs.map(({ dataImageUrl }, index) => [
        dataImageUrl,
        result.assets[index]?.assetUrl ?? null,
      ]),
    );
  } catch {
    return new Map(inputs.map(({ dataImageUrl }) => [dataImageUrl, null]));
  }
}

async function createClipboardFileAssets(
  runtime: BlockEditorRuntime,
  files: File[],
): Promise<CreatedClipboardAsset[]> {
  try {
    const assets = await Promise.all(files.map(readClipboardImageFile));
    const result = await runtime.assets.create({ assets });
    return files.map((file, index) => ({
      altText: result.assets[index]?.altText ?? file.name,
      assetUrl: result.assets[index]?.assetUrl ?? null,
    }));
  } catch {
    return files.map((file) => ({
      altText: file.name,
      assetUrl: null,
    }));
  }
}

async function createClipboardData(
  view: EditorView,
  runtime: BlockEditorRuntime,
  slice: Slice,
): Promise<ClipboardFormats & { imageFileUrl?: string }> {
  const serialized = view.serializeForClipboard(slice);
  const formats = {
    html: serialized.dom.innerHTML,
    text: serialized.text,
  };
  const assetUrlMap = await resolveClipboardAssets(runtime, formats);
  const rewritten = rewriteClipboardAssetUrlsToFiles(formats, assetUrlMap);
  const fileUrls = collectFileUrlsFromClipboardFormats(rewritten.html, rewritten.text);

  return {
    ...rewritten,
    ...(fileUrls.length === 1 ? { imageFileUrl: fileUrls[0] } : {}),
  };
}

export async function copyEditorSlice(
  view: EditorView,
  runtime: BlockEditorRuntime,
  slice: Slice,
): Promise<void> {
  await runtime.clipboard.write(await createClipboardData(view, runtime, slice));
}

export async function copyWholeBlock(editor: Editor, runtime: BlockEditorRuntime): Promise<void> {
  await editor.action(async (ctx) => {
    const view = ctx.get(editorViewCtx);
    await copyEditorSlice(view, runtime, new AllSelection(view.state.doc).content());
  });
}

async function importClipboardFiles(
  runtime: BlockEditorRuntime,
  formats: ClipboardFormats,
): Promise<Map<string, string | null>> {
  const fileUrls = collectFileUrlsFromClipboardFormats(formats.html, formats.text);
  if (fileUrls.length === 0) return new Map();

  try {
    const result = await runtime.assets.import({
      files: fileUrls.map((fileUrl) => ({
        fileName: getFileNameFromUrl(fileUrl),
        fileUrl,
      })),
    });

    return new Map(result.assets.map((asset) => [asset.fileUrl, asset.assetUrl]));
  } catch {
    return new Map(fileUrls.map((fileUrl) => [fileUrl, null]));
  }
}

function parseClipboardFormats(ctx: Ctx, view: EditorView, formats: ClipboardFormats): Slice {
  if (formats.html) {
    const container = document.createElement("div");
    container.innerHTML = formats.html;
    return DOMParser.fromSchema(view.state.schema).parseSlice(container, {
      context: view.state.selection.$from,
      preserveWhitespace: false,
    });
  }

  const doc = ctx.get(parserCtx)(formats.text);
  return new Slice(doc.content, 0, 0);
}

function appendCreatedClipboardAssets(
  formats: ClipboardFormats,
  assets: CreatedClipboardAsset[],
): ClipboardFormats {
  if (assets.length === 0) return formats;

  const htmlImages = assets
    .map((asset) => {
      if (!asset.assetUrl) return ASSET_UNAVAILABLE_HTML;

      const altText = escapeHtmlAttribute(asset.altText);
      return `<img src="${escapeHtmlAttribute(asset.assetUrl)}" alt="${altText}">`;
    })
    .join("");
  const markdownImages = assets
    .map((asset) =>
      asset.assetUrl
        ? `![${asset.altText.replace(/]/g, "\\]")}](${asset.assetUrl})`
        : ASSET_UNAVAILABLE_MARKDOWN,
    )
    .join("\n");

  return {
    html: formats.html ? `${formats.html}${htmlImages}` : "",
    text: [formats.text, markdownImages].filter(Boolean).join("\n"),
  };
}

async function pasteClipboardImages(
  ctx: Ctx,
  view: EditorView,
  runtime: BlockEditorRuntime,
  event: ClipboardEvent,
): Promise<boolean> {
  const formats = {
    html: event.clipboardData?.getData("text/html") ?? "",
    text: event.clipboardData?.getData("text/plain") ?? "",
  };
  const fileUrls = collectFileUrlsFromClipboardFormats(formats.html, formats.text);
  const anyDataImageUrls = collectAnyDataImageUrlsFromClipboardFormats(formats.html, formats.text);
  const dataImageUrls = collectDataImageUrlsFromClipboardFormats(formats.html, formats.text);
  const imageFiles =
    fileUrls.length === 0 && anyDataImageUrls.length === 0 ? collectClipboardImageFiles(event) : [];
  if (fileUrls.length === 0 && anyDataImageUrls.length === 0 && imageFiles.length === 0) {
    return false;
  }

  event.preventDefault();

  const fileUrlMap = await importClipboardFiles(runtime, formats);
  const dataImageUrlMap = await createClipboardDataImageAssets(runtime, dataImageUrls);
  const createdFileAssets = await createClipboardFileAssets(runtime, imageFiles);
  const rewrittenFileUrls = rewriteClipboardFileUrlsToAssets(formats, fileUrlMap);
  const rewrittenDataUrls = rewriteClipboardDataImageUrlsToAssets(
    rewrittenFileUrls,
    dataImageUrlMap,
  );
  const rewritten = appendCreatedClipboardAssets(rewrittenDataUrls, createdFileAssets);
  const slice = parseClipboardFormats(ctx, view, rewritten);
  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView().setMeta("paste", true));
  return true;
}

function handleCopyEvent(
  view: EditorView,
  runtime: BlockEditorRuntime,
  event: ClipboardEvent,
): boolean {
  if (view.state.selection.empty) return false;

  event.preventDefault();
  void copyEditorSlice(view, runtime, view.state.selection.content());
  return true;
}

function handleCutEvent(
  view: EditorView,
  runtime: BlockEditorRuntime,
  event: ClipboardEvent,
): boolean {
  if (view.state.selection.empty) return false;

  event.preventDefault();
  void copyEditorSlice(view, runtime, view.state.selection.content()).then(() => {
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
  });
  return true;
}

export function createEditorClipboardPlugin(runtime: BlockEditorRuntime) {
  return $prose(
    (ctx) =>
      new Plugin({
        props: {
          handleDOMEvents: {
            copy: (view, event) => handleCopyEvent(view, runtime, event),
            cut: (view, event) => handleCutEvent(view, runtime, event),
            paste: (view, event) => {
              const html = event.clipboardData?.getData("text/html") ?? "";
              const text = event.clipboardData?.getData("text/plain") ?? "";
              const hasFileImages =
                collectFileUrlsFromClipboardFormats(html, text).length > 0 ||
                collectAnyDataImageUrlsFromClipboardFormats(html, text).length > 0 ||
                hasClipboardImageFiles(event);
              if (!hasFileImages) return false;

              event.preventDefault();
              void pasteClipboardImages(ctx, view, runtime, event);
              return true;
            },
          },
        },
      }),
  );
}
