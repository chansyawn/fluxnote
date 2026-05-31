import type { Editor } from "@milkdown/kit/core";
import { editorViewCtx, parserCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import { DOMParser, Slice } from "@milkdown/kit/prose/model";
import { AllSelection, Plugin } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

import type { BlockEditorRuntime } from "../core/types";
import { normalizeExternalMarkdown } from "../markdown/external-markdown";
import {
  collectAssetUrlsFromClipboardFormats,
  collectFileUrlsFromClipboardFormats,
  rewriteClipboardAssetUrlsToFiles,
  rewriteClipboardFileUrlsToAssets,
} from "./clipboard-data";

interface ClipboardFormats {
  html: string;
  text: string;
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

async function createClipboardData(
  view: EditorView,
  runtime: BlockEditorRuntime,
  slice: Slice,
): Promise<ClipboardFormats & { imageFileUrl?: string }> {
  const serialized = view.serializeForClipboard(slice);
  const formats = {
    html: serialized.dom.innerHTML,
    text: normalizeExternalMarkdown(serialized.text),
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

async function pasteClipboardFiles(
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
  if (fileUrls.length === 0) return false;

  event.preventDefault();

  const fileUrlMap = await importClipboardFiles(runtime, formats);
  const rewritten = rewriteClipboardFileUrlsToAssets(formats, fileUrlMap);
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
              const hasFileImages =
                collectFileUrlsFromClipboardFormats(
                  event.clipboardData?.getData("text/html") ?? "",
                  event.clipboardData?.getData("text/plain") ?? "",
                ).length > 0;
              if (!hasFileImages) return false;

              event.preventDefault();
              void pasteClipboardFiles(ctx, view, runtime, event);
              return true;
            },
          },
        },
      }),
  );
}
