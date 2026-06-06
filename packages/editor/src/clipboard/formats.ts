import { toHtml } from "hast-util-to-html";
import { type SerializedEditorState } from "lexical";
import { toHast } from "mdast-util-to-hast";

import { createHeadlessMarkdownEditor } from "../document/headless-markdown-editor";
import { exportLexicalToMdast } from "../document/lexical-mdast";
import { exportEditorStateToMarkdown } from "../document/markdown-editor-io";
import type { ClipboardSerializedNode } from "./clipboard-serialized-node";

type ClipboardSerializedRoot = SerializedEditorState<ClipboardSerializedNode>["root"];

const ROOT_BLOCK_NODE_TYPES = new Set([
  "code",
  "heading",
  "horizontalrule",
  "list",
  "paragraph",
  "quote",
  "table",
]);

function createSerializedRoot(children: ClipboardSerializedNode[]): ClipboardSerializedRoot {
  return {
    children,
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  };
}

function createSerializedParagraph(children: ClipboardSerializedNode[]): ClipboardSerializedNode {
  return {
    children,
    direction: null,
    format: "",
    indent: 0,
    textFormat: 0,
    textStyle: "",
    type: "paragraph",
    version: 1,
  };
}

function isRootBlockNode(node: ClipboardSerializedNode): boolean {
  return ROOT_BLOCK_NODE_TYPES.has(node.type);
}

function normalizeRootChildren(nodes: ClipboardSerializedNode[]): ClipboardSerializedNode[] {
  const children: ClipboardSerializedNode[] = [];
  let inlineBuffer: ClipboardSerializedNode[] = [];

  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) {
      return;
    }

    children.push(createSerializedParagraph(inlineBuffer));
    inlineBuffer = [];
  };

  for (const node of nodes) {
    if (isRootBlockNode(node)) {
      flushInlineBuffer();
      children.push(node);
      continue;
    }

    inlineBuffer.push(node);
  }

  flushInlineBuffer();
  return children;
}

function createEditorStateFromClipboardNodes(
  nodes: ClipboardSerializedNode[],
): SerializedEditorState<ClipboardSerializedNode> {
  return {
    root: createSerializedRoot(normalizeRootChildren(nodes)),
  };
}

export function exportClipboardNodesToMarkdown(nodes: ClipboardSerializedNode[]): string {
  const editor = createHeadlessMarkdownEditor();
  const editorState = editor.parseEditorState(createEditorStateFromClipboardNodes(nodes));
  return exportEditorStateToMarkdown(editorState);
}

export function exportClipboardNodesToHtml(nodes: ClipboardSerializedNode[]): string {
  const editor = createHeadlessMarkdownEditor();
  const editorState = editor.parseEditorState(createEditorStateFromClipboardNodes(nodes));
  const hast = toHast(exportLexicalToMdast(editorState), { allowDangerousHtml: false });
  return hast ? toHtml(hast, { allowDangerousHtml: false }) : "";
}
