import { $getClipboardDataFromSelection } from "@lexical/clipboard";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { i18n } from "@lingui/core";
import {
  $getSelection,
  $isNodeSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_HIGH,
  COPY_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { toast } from "sonner";

import { $isNoteEditorImageNode, type NoteEditorImageNode } from "../image/note-editor-image-node";
import { convertAssetToDataUrl } from "../image/note-editor-image-utils";
import { $getMarkdownFromCurrentState } from "./note-editor-clipboard-utils";

export function NoteEditorClipboardPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<ClipboardEvent | null>(
      COPY_COMMAND,
      (event) => {
        const clipboardData = event?.clipboardData;
        if (!clipboardData) {
          return false;
        }

        event.preventDefault();

        editor.read(() => {
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

          if (imageNodes.length === 0) {
            if (originalHtml) {
              clipboardData.setData("text/html", originalHtml);
            }
            if (lexicalJson) {
              clipboardData.setData("application/x-lexical-editor", lexicalJson);
            }
            clipboardData.setData("text/plain", markdown);
          } else {
            void enhanceClipboardWithImages(originalHtml, markdown, imageNodes);
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

async function enhanceClipboardWithImages(
  originalHtml: string | undefined,
  markdown: string,
  imageNodes: NoteEditorImageNode[],
) {
  try {
    const htmlPromise = enhanceHtmlWithImages(originalHtml, imageNodes);

    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": htmlPromise,
        "text/plain": new Blob([markdown], { type: "text/plain" }),
      }),
    ]);

    const imageCount = imageNodes.length;
    toast.success(
      i18n._({
        id: "editor.clipboard.copied-with-images",
        message: `Copied with ${imageCount} image(s)`,
      }),
    );
  } catch (error) {
    console.error("Failed to copy with images:", error);

    toast.error(
      i18n._({
        id: "editor.clipboard.copy-failed",
        message: "Failed to copy content",
      }),
    );
  }
}

async function enhanceHtmlWithImages(
  originalHtml: string | undefined,
  imageNodes: NoteEditorImageNode[],
): Promise<Blob> {
  const imageDataMap = new Map<string, string>();

  await Promise.all(
    imageNodes.map(async (node) => {
      const src = node.getSrc();
      const blockId = node.getBlockId();
      const dataUrl = await convertAssetToDataUrl(src, blockId);

      if (dataUrl) {
        imageDataMap.set(src, dataUrl);
      }
    }),
  );

  let enhancedHtml = originalHtml || "";

  if (enhancedHtml && imageDataMap.size > 0) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(enhancedHtml, "text/html");

    const images = doc.querySelectorAll("img");
    images.forEach((img) => {
      const originalSrc = img.getAttribute("data-internal-asset") || img.src;

      const dataUrl = imageDataMap.get(originalSrc);
      if (dataUrl) {
        img.src = dataUrl;
        img.removeAttribute("data-internal-asset");
      }
    });

    enhancedHtml = doc.body.innerHTML;
  }

  return new Blob([enhancedHtml], { type: "text/html" });
}
