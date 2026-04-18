import { $generateNodesFromSerializedNodes } from "@lexical/clipboard";
import { $convertToMarkdownString } from "@lexical/markdown";
import {
  $createParagraphNode,
  $getRoot,
  $isDecoratorNode,
  $isElementNode,
  createEditor,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";

import { NOTE_EDITOR_NODES } from "../composer/note-editor-nodes";
import { $isNoteEditorImageNode } from "../image/note-editor-image-node";
import {
  getCachedImageDataUrl,
  isInternalAssetUrl,
  loadImageClipboardPayload,
} from "../image/note-editor-image-utils";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "../markdown/note-editor-markdown";
import type {
  ClipboardImageReference,
  ClipboardPayload,
  ClipboardSnapshot,
} from "./note-editor-clipboard-types";

export function materializeClipboardSnapshot(snapshot: ClipboardSnapshot): ClipboardPayload {
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

export async function hydrateClipboardPayload(
  payload: ClipboardPayload,
): Promise<ClipboardPayload> {
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

  return {
    ...payload,
    hasUncachedInternalImages: payload.imageRefs.some(
      ({ blockId, src }) =>
        isInternalAssetUrl(src) && !hydratedImages.has(src) && !getCachedImageDataUrl(src, blockId),
    ),
    html: htmlDocument.body.innerHTML || undefined,
  };
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
