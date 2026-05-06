import {
  $generateJSONFromSelectedNodes,
  $getHtmlContent,
  type LexicalClipboardData,
} from "@lexical/clipboard";
import {
  $getSelection,
  $selectAll,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from "lexical";

import { createMarkdownEditor, exportEditorStateToMarkdown } from "../core/editor-state";

export const BLOCK_EDITOR_CLIPBOARD_NAMESPACE = "BlockEditor";

type ClipboardSerializedNode = SerializedLexicalNode &
  Record<string, unknown> & {
    children?: ClipboardSerializedNode[];
  };

type ClipboardSerializedRoot = SerializedEditorState<ClipboardSerializedNode>["root"];

export type BlockEditorClipboardData = LexicalClipboardData;

const ROOT_BLOCK_NODE_TYPES = new Set([
  "code",
  "heading",
  "horizontalrule",
  "list",
  "paragraph",
  "placeholder-block",
  "quote",
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

function exportClipboardNodesToMarkdown(nodes: ClipboardSerializedNode[]): string {
  const editor = createMarkdownEditor(BLOCK_EDITOR_CLIPBOARD_NAMESPACE);
  const editorState = editor.parseEditorState(createEditorStateFromClipboardNodes(nodes));
  return exportEditorStateToMarkdown(editorState);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportSelectionToHtml(editor: LexicalEditor, selection: BaseSelection): string {
  try {
    return $getHtmlContent(editor, selection);
  } catch {
    return escapeHtml(selection.getTextContent()).replaceAll("\n", "<br>");
  }
}

function createClipboardDataFromSelection(
  editor: LexicalEditor,
  selection: BaseSelection,
): BlockEditorClipboardData | null {
  if (selection.isCollapsed() || selection.getNodes().length === 0) {
    return null;
  }

  const lexical = $generateJSONFromSelectedNodes<ClipboardSerializedNode>(editor, selection);
  if (lexical.nodes.length === 0) {
    return null;
  }

  return {
    "application/x-lexical-editor": JSON.stringify({
      namespace: BLOCK_EDITOR_CLIPBOARD_NAMESPACE,
      nodes: lexical.nodes,
    }),
    "text/html": exportSelectionToHtml(editor, selection),
    "text/plain": exportClipboardNodesToMarkdown(lexical.nodes),
  };
}

export function $createClipboardDataFromCurrentSelection(
  editor: LexicalEditor,
): BlockEditorClipboardData | null {
  const selection = $getSelection();
  if (selection === null) {
    return null;
  }

  return createClipboardDataFromSelection(editor, selection);
}

export function createClipboardDataFromCurrentSelection(
  editor: LexicalEditor,
): BlockEditorClipboardData | null {
  return editor.read(() => $createClipboardDataFromCurrentSelection(editor));
}

export function createClipboardDataFromDocument(
  editor: LexicalEditor,
): BlockEditorClipboardData | null {
  let data: BlockEditorClipboardData | null = null;

  editor.update(
    () => {
      const previousSelection = $getSelection()?.clone() ?? null;
      const selection = $selectAll();
      data = createClipboardDataFromSelection(editor, selection);
      $setSelection(previousSelection);
    },
    { discrete: true },
  );

  return data;
}
