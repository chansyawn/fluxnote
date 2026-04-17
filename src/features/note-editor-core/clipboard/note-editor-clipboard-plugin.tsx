import { $getClipboardDataFromSelection } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COPY_COMMAND,
  type BaseSelection,
} from "lexical";
import { useEffect } from "react";

import { $isNoteEditorImageNode, type NoteEditorImageNode } from "../image/note-editor-image-node";
import { getCachedImageDataUrl, loadImageClipboardPayload } from "../image/note-editor-image-utils";
import { $getMarkdownFromCurrentState } from "./note-editor-clipboard-utils";

interface SelectedImagePayload {
  altText: string;
  blockId: string;
  src: string;
}

interface ClipboardSelectionPayload {
  html: string | undefined;
  lexicalJson: string | undefined;
  markdown: string;
  singleSelectedImage: SelectedImagePayload | null;
}

export function NoteEditorClipboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent | null>(
      COPY_COMMAND,
      (event) => {
        const clipboardData = event?.clipboardData;
        const selectionPayload = editor.read(() => collectClipboardSelectionPayload(editor));

        if (!selectionPayload) {
          return false;
        }

        if (clipboardData) {
          event.preventDefault();
          writeSelectionToDataTransfer(clipboardData, selectionPayload);

          if (selectionPayload.singleSelectedImage) {
            void writeSingleImageToClipboard(selectionPayload);
          }

          return true;
        }

        if (!canUseAsyncClipboardWrite() && !canUseAsyncClipboardTextWrite()) {
          return false;
        }

        event?.preventDefault();
        void writeSelectionToNavigatorClipboard(selectionPayload);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

function getSingleSelectedImageNode(
  selection: BaseSelection | null,
  imageNodes: NoteEditorImageNode[],
): NoteEditorImageNode | null {
  if (!selection || imageNodes.length !== 1) {
    return null;
  }

  const selectedNodes = selection.getNodes();
  if (selectedNodes.length !== 1) {
    return null;
  }

  const [singleNode] = selectedNodes;
  return $isNoteEditorImageNode(singleNode) ? singleNode : null;
}

function collectClipboardSelectionPayload(
  editor: Parameters<typeof $getMarkdownFromCurrentState>[0],
) {
  const selection = $getSelection();
  const lexicalData = $getClipboardDataFromSelection(selection);
  const lexicalJson = lexicalData?.["application/x-lexical-editor"];
  const originalHtml = lexicalData?.["text/html"];
  const markdown = $getMarkdownFromCurrentState(editor);

  const imageNodes: NoteEditorImageNode[] = [];

  if ($isRangeSelection(selection)) {
    imageNodes.push(...selection.getNodes().filter($isNoteEditorImageNode));
  } else if ($isNodeSelection(selection)) {
    imageNodes.push(...selection.getNodes().filter($isNoteEditorImageNode));
  }

  const html = imageNodes.length
    ? enhanceHtmlWithCachedImages(originalHtml, imageNodes)
    : originalHtml;
  const singleSelectedImageNode = getSingleSelectedImageNode(selection, imageNodes);

  return {
    html,
    lexicalJson,
    markdown,
    singleSelectedImage: singleSelectedImageNode
      ? {
          altText: singleSelectedImageNode.getAltText(),
          blockId: singleSelectedImageNode.getBlockId(),
          src: singleSelectedImageNode.getSrc(),
        }
      : null,
  } satisfies ClipboardSelectionPayload;
}

function writeSelectionToDataTransfer(
  clipboardData: DataTransfer,
  payload: ClipboardSelectionPayload,
): void {
  if (payload.html) {
    clipboardData.setData("text/html", payload.html);
  }
  if (payload.lexicalJson) {
    clipboardData.setData("application/x-lexical-editor", payload.lexicalJson);
  }
  clipboardData.setData("text/plain", payload.markdown);
}

function enhanceHtmlWithCachedImages(
  originalHtml: string | undefined,
  imageNodes: NoteEditorImageNode[],
) {
  if (!originalHtml) {
    return originalHtml;
  }

  const imageDataMap = new Map<string, string>();

  for (const node of imageNodes) {
    const dataUrl = getCachedImageDataUrl(node.getSrc(), node.getBlockId());
    if (dataUrl) {
      imageDataMap.set(node.getSrc(), dataUrl);
    }
  }

  if (imageDataMap.size === 0) {
    return originalHtml;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(originalHtml, "text/html");

  const images = doc.querySelectorAll("img");
  images.forEach((img) => {
    const originalSrc = img.getAttribute("data-internal-asset") || img.src;

    const dataUrl = imageDataMap.get(originalSrc);
    if (dataUrl) {
      img.src = dataUrl;
    }
  });

  return doc.body.innerHTML;
}

async function writeSelectionToNavigatorClipboard(
  payload: ClipboardSelectionPayload,
): Promise<void> {
  if (payload.singleSelectedImage) {
    await writeSingleImageToClipboard(payload);
    return;
  }

  await writeStandardClipboardContent(payload);
}

async function writeSingleImageToClipboard({
  html,
  lexicalJson,
  markdown,
  singleSelectedImage,
}: ClipboardSelectionPayload): Promise<void> {
  if (!singleSelectedImage) {
    return;
  }

  try {
    const imagePayload = await loadImageClipboardPayload(
      singleSelectedImage.src,
      singleSelectedImage.blockId,
    );
    if (!imagePayload || !imagePayload.mimeType.startsWith("image/")) {
      await writeStandardClipboardContent({
        html,
        lexicalJson,
        markdown,
        singleSelectedImage,
      });
      return;
    }

    const htmlContent =
      html || createSingleImageHtml(imagePayload.dataUrl, singleSelectedImage.altText);

    const imageClipboardItem = buildClipboardItemData({
      html: htmlContent,
      imageBlob: imagePayload.blob,
      imageMimeType: imagePayload.mimeType,
      lexicalJson,
      markdown,
    });

    const didWriteImage = await tryWriteClipboardItem(imageClipboardItem);
    if (didWriteImage) {
      return;
    }

    await writeStandardClipboardContent({
      html: htmlContent,
      lexicalJson,
      markdown,
      singleSelectedImage,
    });
  } catch (error) {
    console.error("Failed to write single image to clipboard:", error);
  }
}

async function writeStandardClipboardContent(payload: ClipboardSelectionPayload): Promise<void> {
  const standardClipboardItem = buildClipboardItemData({
    html: payload.html,
    lexicalJson: payload.lexicalJson,
    markdown: payload.markdown,
  });

  const wroteWithLexical = await tryWriteClipboardItem(standardClipboardItem);
  if (wroteWithLexical) {
    return;
  }

  const plainClipboardItem = buildClipboardItemData({
    html: payload.html,
    markdown: payload.markdown,
  });
  const wroteStandard = await tryWriteClipboardItem(plainClipboardItem);
  if (wroteStandard) {
    return;
  }

  if (canUseAsyncClipboardTextWrite()) {
    await navigator.clipboard.writeText(payload.markdown);
  }
}

function buildClipboardItemData({
  html,
  imageBlob,
  imageMimeType,
  lexicalJson,
  markdown,
}: {
  html?: string;
  imageBlob?: Blob;
  imageMimeType?: string;
  lexicalJson?: string;
  markdown: string;
}): Record<string, Blob> {
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
