import {
  $generateJSONFromSelectedNodes,
  $generateNodesFromSerializedNodes,
} from "@lexical/clipboard";
import { $convertToMarkdownString } from "@lexical/markdown";
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isDecoratorNode,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  createEditor,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
  type SerializedLexicalNode,
} from "lexical";

import { NOTE_EDITOR_NODES } from "../composer/note-editor-nodes";
import { $isNoteEditorImageNode } from "../image/note-editor-image-node";
import {
  getCachedImageDataUrl,
  isInternalAssetUrl,
  loadImageClipboardPayload,
} from "../image/note-editor-image-utils";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "../markdown/note-editor-markdown";

export type ClipboardCopyScope = "document" | "selection";

interface ClipboardImageReference {
  altText: string;
  blockId: string;
  src: string;
}

interface ClipboardSnapshot {
  serializedNodes: SerializedClipboardNode[];
  singleSelectedImage: ClipboardImageReference | null;
}

type SerializedClipboardNode = SerializedLexicalNode & {
  children?: SerializedClipboardNode[];
};

export interface ClipboardPayload {
  html: string | undefined;
  hasUncachedInternalImages: boolean;
  imageRefs: ClipboardImageReference[];
  lexicalJson: string;
  markdown: string;
  singleSelectedImage: ClipboardImageReference | null;
}

export function canWriteClipboardPayloadAsynchronously(): boolean {
  return canUseAsyncClipboardWrite() || canUseAsyncClipboardTextWrite();
}

export function collectClipboardPayload(
  editor: LexicalEditor,
  scope: ClipboardCopyScope,
): ClipboardPayload | null {
  const snapshot = editor.read(() => collectClipboardSnapshot(editor, scope));
  if (!snapshot) {
    return null;
  }

  return materializeClipboardSnapshot(snapshot);
}

export async function copyEditorContentToClipboard(
  editor: LexicalEditor,
  scope: ClipboardCopyScope,
): Promise<void> {
  const payload = collectClipboardPayload(editor, scope);
  if (!payload) {
    return;
  }

  const wroteClipboard = await writeClipboardPayloadToNavigatorClipboard(payload);
  if (!wroteClipboard) {
    throw new Error("Clipboard API is not available");
  }
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

  if (hydratedPayload.singleSelectedImage) {
    return await writeSingleImageToClipboard(hydratedPayload);
  }

  return await writeStandardClipboardContent(hydratedPayload);
}

function collectClipboardSnapshot(
  editor: LexicalEditor,
  scope: ClipboardCopyScope,
): ClipboardSnapshot | null {
  if (scope === "document") {
    return collectDocumentClipboardSnapshot();
  }

  const selection = $getSelection();
  if (!selection) {
    return null;
  }

  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    return null;
  }

  if (!$isRangeSelection(selection) && !$isNodeSelection(selection)) {
    return null;
  }

  const serializedData = $generateJSONFromSelectedNodes(editor, selection);
  const serializedNodes = serializedData.nodes as SerializedClipboardNode[] | undefined;

  if (!serializedNodes || serializedNodes.length === 0) {
    return null;
  }

  return {
    serializedNodes,
    singleSelectedImage: getSingleSelectedImageReference(selection, selection.getNodes()),
  };
}

function collectDocumentClipboardSnapshot(): ClipboardSnapshot {
  const rootChildren = $getRoot().getChildren();
  const serializedNodes = serializeClipboardNodes(rootChildren);

  return {
    serializedNodes,
    singleSelectedImage: getSingleSelectedImageReference(null, rootChildren),
  };
}

function getSingleSelectedImageReference(
  selection: BaseSelection | null,
  nodes: readonly LexicalNode[],
): ClipboardImageReference | null {
  if (selection && selection.getNodes().length !== 1) {
    return null;
  }

  if (nodes.length !== 1) {
    return null;
  }

  const [singleNode] = nodes;
  if (!$isNoteEditorImageNode(singleNode)) {
    return null;
  }

  return {
    altText: singleNode.getAltText(),
    blockId: singleNode.getBlockId(),
    src: singleNode.getSrc(),
  };
}

function materializeClipboardSnapshot(snapshot: ClipboardSnapshot): ClipboardPayload {
  const tempEditor = createEditor({
    nodes: NOTE_EDITOR_NODES,
    onError: (error) => {
      throw error;
    },
  });

  const lexicalJson = JSON.stringify({ nodes: snapshot.serializedNodes });
  let payload: ClipboardPayload = {
    html: undefined,
    hasUncachedInternalImages: false,
    imageRefs: [],
    lexicalJson,
    markdown: "",
    singleSelectedImage: snapshot.singleSelectedImage,
  };

  tempEditor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const nodes = $generateNodesFromSerializedNodes(snapshot.serializedNodes);

      appendNodesToRoot(nodes);

      const imageRefs = collectImageReferences(root.getChildren());
      payload = {
        html: generateClipboardHtml(tempEditor),
        hasUncachedInternalImages: imageRefs.some(
          ({ blockId, src }) => isInternalAssetUrl(src) && !getCachedImageDataUrl(src, blockId),
        ),
        imageRefs,
        lexicalJson,
        markdown: $convertToMarkdownString(NOTE_EDITOR_MARKDOWN_TRANSFORMERS, root),
        singleSelectedImage: snapshot.singleSelectedImage,
      };
    },
    { discrete: true },
  );

  return payload;
}

function appendNodesToRoot(nodes: LexicalNode[]): void {
  const root = $getRoot();

  for (const node of nodes) {
    if ($isElementNode(node) || $isDecoratorNode(node)) {
      root.append(node);
      continue;
    }

    const paragraph = $createParagraphNode();
    paragraph.append(node);
    root.append(paragraph);
  }
}

function serializeClipboardNodes(nodes: readonly LexicalNode[]): SerializedClipboardNode[] {
  return nodes.map((node) => serializeClipboardNode(node));
}

function serializeClipboardNode(node: LexicalNode): SerializedClipboardNode {
  const serializedNode = node.exportJSON() as SerializedClipboardNode;

  if ($isElementNode(node)) {
    serializedNode.children = serializeClipboardNodes(node.getChildren());
  }

  return serializedNode;
}

function collectImageReferences(nodes: readonly LexicalNode[]): ClipboardImageReference[] {
  const imageRefs: ClipboardImageReference[] = [];

  for (const node of nodes) {
    if ($isNoteEditorImageNode(node)) {
      imageRefs.push({
        altText: node.getAltText(),
        blockId: node.getBlockId(),
        src: node.getSrc(),
      });
      continue;
    }

    if ($isElementNode(node)) {
      imageRefs.push(...collectImageReferences(node.getChildren()));
    }
  }

  return imageRefs;
}

function generateClipboardHtml(editor: LexicalEditor): string | undefined {
  const htmlDocument = document.implementation.createHTMLDocument("");
  const container = htmlDocument.createElement("div");

  for (const child of $getRoot().getChildren()) {
    const exportedNode = exportNodeToDom(child, editor);
    if (exportedNode) {
      container.append(exportedNode);
    }
  }

  return container.innerHTML || undefined;
}

function exportNodeToDom(node: LexicalNode, editor: LexicalEditor): Node | null {
  const { after, element } = node.exportDOM(editor);
  if (!element) {
    return null;
  }

  if ($isElementNode(node) && isDomContainerNode(element)) {
    for (const child of node.getChildren()) {
      const childElement = exportNodeToDom(child, editor);
      if (childElement) {
        element.append(childElement);
      }
    }
  }

  const finalizedElement = after ? after(element) : element;
  return finalizedElement ?? null;
}

function isDomContainerNode(node: Node): node is HTMLElement | DocumentFragment {
  return node instanceof HTMLElement || node instanceof DocumentFragment;
}

async function hydrateClipboardPayload(payload: ClipboardPayload): Promise<ClipboardPayload> {
  if (!payload.html || payload.imageRefs.length === 0) {
    return payload;
  }

  const hydratedImages = new Map<string, string>();

  await Promise.all(
    payload.imageRefs.map(async ({ blockId, src }) => {
      if (!isInternalAssetUrl(src) || hydratedImages.has(src)) {
        return;
      }

      const imagePayload = await loadImageClipboardPayload(src, blockId);
      if (imagePayload) {
        hydratedImages.set(src, imagePayload.dataUrl);
      }
    }),
  );

  if (hydratedImages.size === 0) {
    return payload;
  }

  const parser = new DOMParser();
  const htmlDocument = parser.parseFromString(payload.html, "text/html");

  htmlDocument.querySelectorAll("img").forEach((imageElement) => {
    const originalSrc =
      imageElement.getAttribute("data-internal-asset") || imageElement.getAttribute("src");

    if (!originalSrc) {
      return;
    }

    const hydratedSrc = hydratedImages.get(originalSrc);
    if (hydratedSrc) {
      imageElement.setAttribute("src", hydratedSrc);
    }
  });

  const hasUncachedInternalImages = payload.imageRefs.some(
    ({ blockId, src }) =>
      isInternalAssetUrl(src) && !hydratedImages.has(src) && !getCachedImageDataUrl(src, blockId),
  );

  return {
    ...payload,
    hasUncachedInternalImages,
    html: htmlDocument.body.innerHTML || undefined,
  };
}

async function writeSingleImageToClipboard(payload: ClipboardPayload): Promise<boolean> {
  const singleSelectedImage = payload.singleSelectedImage;
  if (!singleSelectedImage) {
    return false;
  }

  try {
    const imagePayload = await loadImageClipboardPayload(
      singleSelectedImage.src,
      singleSelectedImage.blockId,
    );

    if (!imagePayload || !imagePayload.mimeType.startsWith("image/")) {
      return await writeStandardClipboardContent(payload);
    }

    const html =
      payload.html ?? createSingleImageHtml(imagePayload.dataUrl, singleSelectedImage.altText);
    const clipboardItemData = buildClipboardItemData({
      html,
      imageBlob: imagePayload.blob,
      imageMimeType: imagePayload.mimeType,
      lexicalJson: payload.lexicalJson,
      markdown: payload.markdown,
    });

    const wroteImage = await tryWriteClipboardItem(clipboardItemData);
    if (wroteImage) {
      return true;
    }

    return await writeStandardClipboardContent({
      ...payload,
      html,
    });
  } catch (error) {
    console.error("Failed to write single image to clipboard:", error);
    return false;
  }
}

async function writeStandardClipboardContent(payload: ClipboardPayload): Promise<boolean> {
  const clipboardItemWithLexical = buildClipboardItemData({
    html: payload.html,
    lexicalJson: payload.lexicalJson,
    markdown: payload.markdown,
  });

  const wroteWithLexical = await tryWriteClipboardItem(clipboardItemWithLexical);
  if (wroteWithLexical) {
    return true;
  }

  const standardClipboardItem = buildClipboardItemData({
    html: payload.html,
    markdown: payload.markdown,
  });
  const wroteStandard = await tryWriteClipboardItem(standardClipboardItem);
  if (wroteStandard) {
    return true;
  }

  if (canUseAsyncClipboardTextWrite()) {
    await navigator.clipboard.writeText(payload.markdown);
    return true;
  }

  return false;
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
