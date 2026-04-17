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
  $isRangeSelection,
  createEditor,
  type LexicalEditor,
} from "lexical";

import { NOTE_EDITOR_NODES } from "../composer/note-editor-nodes";
import { $isNoteEditorImageNode } from "../image/note-editor-image-node";
import { convertAssetToDataUrl } from "../image/note-editor-image-utils";
import { NOTE_EDITOR_MARKDOWN_TRANSFORMERS } from "../markdown/note-editor-markdown";

/**
 * 将当前选区内容序列化为 Markdown。
 * 若无选区或选区为空，则序列化整个编辑器。
 * 此函数必须在 editor.read() 上下文中调用。
 */
export function $getMarkdownFromCurrentState(editor: LexicalEditor): string {
  const selection = $getSelection();
  const convertToMarkdown = (root = $getRoot()) =>
    $convertToMarkdownString(NOTE_EDITOR_MARKDOWN_TRANSFORMERS, root);

  if (!selection || selection.isCollapsed() || !$isRangeSelection(selection)) {
    return convertToMarkdown();
  }

  try {
    const serializedData = $generateJSONFromSelectedNodes(editor, selection);
    if (!serializedData.nodes || serializedData.nodes.length === 0) {
      return convertToMarkdown();
    }

    const tempEditor = createEditor({
      nodes: NOTE_EDITOR_NODES,
      onError: (error) => {
        throw error;
      },
    });

    let markdown = "";

    tempEditor.update(
      () => {
        const root = $getRoot();
        root.clear();
        const nodes = $generateNodesFromSerializedNodes(serializedData.nodes);

        for (const node of nodes) {
          // Root 只能接受 ElementNode 或 DecoratorNode
          if ($isElementNode(node) || $isDecoratorNode(node)) {
            root.append(node);
          } else {
            // TextNode 等需要包装在 ParagraphNode 中
            const paragraph = $createParagraphNode();
            paragraph.append(node);
            root.append(paragraph);
          }
        }

        markdown = convertToMarkdown(root);
      },
      { discrete: true },
    );

    return markdown || convertToMarkdown();
  } catch (error) {
    console.warn("Failed to convert selection to markdown:", error);
    return convertToMarkdown();
  }
}

/**
 * 复制整个编辑器内容，包含图片的 Data URL
 */
export async function copyContentWithImages(editor: LexicalEditor): Promise<void> {
  const { markdown, imageData } = editor.read(() => {
    const markdown = $convertToMarkdownString(NOTE_EDITOR_MARKDOWN_TRANSFORMERS);
    const root = $getRoot();
    const imageData: Array<{ src: string; blockId: string }> = [];

    function collectImages(node: any) {
      if ($isNoteEditorImageNode(node)) {
        imageData.push({
          src: node.getSrc(),
          blockId: node.getBlockId(),
        });
      }
      if ($isElementNode(node)) {
        node.getChildren().forEach(collectImages);
      }
    }

    root.getChildren().forEach(collectImages);

    return { markdown, imageData };
  });

  if (imageData.length === 0) {
    await navigator.clipboard.writeText(markdown);
    return;
  }

  const htmlPromise = (async () => {
    const imageDataMap = new Map<string, string>();

    await Promise.all(
      imageData.map(async ({ src, blockId }) => {
        const dataUrl = await convertAssetToDataUrl(src, blockId);

        if (dataUrl) {
          imageDataMap.set(src, dataUrl);
        }
      }),
    );

    const lines = markdown.split("\n");
    const htmlLines: string[] = [];

    for (const line of lines) {
      const imageMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        const dataUrl = imageDataMap.get(src);
        if (dataUrl) {
          htmlLines.push(`<img src="${dataUrl}" alt="${alt}" />`);
        } else {
          htmlLines.push(`<p>${line}</p>`);
        }
      } else if (line.trim()) {
        htmlLines.push(`<p>${line}</p>`);
      }
    }

    const enhancedHtml = htmlLines.join("");
    return new Blob([enhancedHtml], { type: "text/html" });
  })();

  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": htmlPromise,
      "text/plain": new Blob([markdown], { type: "text/plain" }),
    }),
  ]);
}
