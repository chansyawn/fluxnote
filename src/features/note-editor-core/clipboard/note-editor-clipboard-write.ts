import { loadImageClipboardPayload } from "../image/note-editor-image-utils";
import { hydrateClipboardPayload } from "./note-editor-clipboard-serialize";
import type {
  ClipboardItemBuildOptions,
  ClipboardPayload,
  ResolvedSingleImageClipboardContent,
} from "./note-editor-clipboard-types";

export function canWriteClipboardPayloadAsynchronously(): boolean {
  return canUseAsyncClipboardWrite() || canUseAsyncClipboardTextWrite();
}

export function writeClipboardPayloadToDataTransfer(
  clipboardData: DataTransfer,
  payload: ClipboardPayload,
): void {
  if (payload.html) {
    clipboardData.setData("text/html", payload.html);
  }

  clipboardData.setData("application/x-lexical-editor", payload.lexicalJson);
  clipboardData.setData("text/plain", payload.markdown);
}

export async function writeClipboardPayloadToNavigatorClipboard(
  payload: ClipboardPayload,
): Promise<boolean> {
  const hydratedPayload = await hydrateClipboardPayload(payload);
  const singleImageContent = await resolveSingleImageClipboardContent(hydratedPayload);

  for (const candidate of buildClipboardWriteCandidates(hydratedPayload, singleImageContent)) {
    if (await tryWriteClipboardItem(candidate)) {
      return true;
    }
  }

  if (canUseAsyncClipboardTextWrite()) {
    await navigator.clipboard.writeText(hydratedPayload.markdown);
    return true;
  }

  return false;
}

export function buildClipboardWriteCandidates(
  payload: ClipboardPayload,
  singleImageContent?: ResolvedSingleImageClipboardContent | null,
): Array<Record<string, Blob>> {
  const html = singleImageContent?.html ?? payload.html;
  const candidates: Array<Record<string, Blob>> = [];
  const seenSignatures = new Set<string>();

  const pushCandidate = (options: ClipboardItemBuildOptions): void => {
    const candidate = buildClipboardItemData(options);
    const candidateSignature = Object.keys(candidate).join("|");

    if (seenSignatures.has(candidateSignature)) {
      return;
    }

    seenSignatures.add(candidateSignature);
    candidates.push(candidate);
  };

  if (singleImageContent) {
    pushCandidate({
      html,
      imageBlob: singleImageContent.imageBlob,
      imageMimeType: singleImageContent.imageMimeType,
      lexicalJson: payload.lexicalJson,
      markdown: payload.markdown,
    });
  }

  pushCandidate({
    html,
    lexicalJson: payload.lexicalJson,
    markdown: payload.markdown,
  });

  pushCandidate({
    html,
    markdown: payload.markdown,
  });

  return candidates;
}

function buildClipboardItemData({
  html,
  imageBlob,
  imageMimeType,
  lexicalJson,
  markdown,
}: ClipboardItemBuildOptions): Record<string, Blob> {
  const clipboardItemData: Record<string, Blob> = {};

  if (imageBlob && imageMimeType) {
    clipboardItemData[imageMimeType] = imageBlob;
  }

  if (html) {
    clipboardItemData["text/html"] = new Blob([html], { type: "text/html" });
  }

  clipboardItemData["text/plain"] = new Blob([markdown], { type: "text/plain" });

  if (lexicalJson) {
    clipboardItemData["application/x-lexical-editor"] = new Blob([lexicalJson], {
      type: "application/x-lexical-editor",
    });
  }

  return clipboardItemData;
}

async function resolveSingleImageClipboardContent(
  payload: ClipboardPayload,
): Promise<ResolvedSingleImageClipboardContent | null> {
  const singleSelectedImage = payload.singleSelectedImage;
  if (!singleSelectedImage) {
    return null;
  }

  try {
    const imagePayload = await loadImageClipboardPayload(
      singleSelectedImage.src,
      singleSelectedImage.blockId,
    );
    if (!imagePayload || !imagePayload.mimeType.startsWith("image/")) {
      return null;
    }

    return {
      html:
        payload.html ?? createSingleImageHtml(imagePayload.dataUrl, singleSelectedImage.altText),
      imageBlob: imagePayload.blob,
      imageMimeType: imagePayload.mimeType,
    };
  } catch (error) {
    console.error("Failed to resolve single image clipboard content:", error);
    return null;
  }
}

async function tryWriteClipboardItem(clipboardItemData: Record<string, Blob>): Promise<boolean> {
  if (!canUseAsyncClipboardWrite() || typeof ClipboardItem === "undefined") {
    return false;
  }

  try {
    await navigator.clipboard.write([new ClipboardItem(clipboardItemData)]);
    return true;
  } catch {
    return false;
  }
}

function canUseAsyncClipboardWrite(): boolean {
  return typeof navigator.clipboard?.write === "function";
}

function canUseAsyncClipboardTextWrite(): boolean {
  return typeof navigator.clipboard?.writeText === "function";
}

function createSingleImageHtml(dataUrl: string, altText: string): string {
  const htmlDocument = document.implementation.createHTMLDocument("");
  const imageElement = htmlDocument.createElement("img");
  imageElement.src = dataUrl;
  imageElement.alt = altText;
  return imageElement.outerHTML;
}
