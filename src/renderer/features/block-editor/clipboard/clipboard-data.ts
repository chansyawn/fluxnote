import { $generateJSONFromSelectedNodes, $getHtmlContent } from "@lexical/clipboard";
import { resolveAsset, type ResolveAssetResult } from "@renderer/clients";
import type {
  BlockEditorClipboardPayload,
  BlockEditorClipboardWriteRequest,
  ClipboardSerializedNode,
} from "@shared/features/block-editor/clipboard";
import {
  $getSelection,
  $selectAll,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
  type SerializedEditorState,
} from "lexical";

import { createMarkdownEditor, exportEditorStateToMarkdown } from "../editor-state";
import { collectClipboardAssetUrls, rewriteClipboardAssetUrls } from "./clipboard-assets";

type ClipboardSerializedRoot = SerializedEditorState<ClipboardSerializedNode>["root"];

type ResolveAssetsClient = typeof resolveAsset;

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
  const editor = createMarkdownEditor("BlockEditorClipboardExport");
  const editorState = editor.parseEditorState(createEditorStateFromClipboardNodes(nodes));
  return exportEditorStateToMarkdown(editorState);
}

function exportClipboardNodesToHtml(nodes: ClipboardSerializedNode[]): string {
  const editor = createMarkdownEditor("BlockEditorClipboardHtmlExport");
  const editorState = editor.parseEditorState(createEditorStateFromClipboardNodes(nodes));
  let html = "";

  editor.setEditorState(editorState);
  editor.update(
    () => {
      const selection = $selectAll();
      html = $getHtmlContent(editor, selection);
      $setSelection(null);
    },
    { discrete: true },
  );

  return html;
}

function exportSelectionToHtml(editor: LexicalEditor, selection: BaseSelection): string {
  try {
    return $getHtmlContent(editor, selection);
  } catch {
    return "";
  }
}

function createAssetUrlMap(result: ResolveAssetResult): Map<string, string> {
  return new Map(result.assets.map((asset) => [asset.assetUrl, asset.fileUrl]));
}

function findSingleSelectedImageNode(
  nodes: ReadonlyArray<ClipboardSerializedNode>,
): ClipboardSerializedNode | null {
  if (nodes.length !== 1) {
    return null;
  }

  const [node] = nodes;
  if (node.type === "image") {
    return node;
  }

  if (node.type !== "paragraph" || node.children?.length !== 1) {
    return null;
  }

  const [child] = node.children;
  return child?.type === "image" ? child : null;
}

function createPayload(
  sourceBlockId: string,
  nodes: ClipboardSerializedNode[],
): BlockEditorClipboardPayload {
  return {
    nodes,
    sourceBlockId,
    version: 1,
  };
}

function createClipboardSnapshotFromSelection(
  editor: LexicalEditor,
  blockId: string,
  selection: BaseSelection,
  options: { includeImageFileUrl: boolean },
): {
  assetUrls: string[];
  html: string;
  imageAssetUrl: string | null;
  markdown: string;
  nodes: ClipboardSerializedNode[];
  sourceBlockId: string;
} | null {
  if (selection.isCollapsed() || selection.getNodes().length === 0) {
    return null;
  }

  const lexical = $generateJSONFromSelectedNodes<ClipboardSerializedNode>(editor, selection);
  if (lexical.nodes.length === 0) {
    return null;
  }

  const assetUrls = collectClipboardAssetUrls(lexical.nodes);
  const selectedImageNode = options.includeImageFileUrl
    ? findSingleSelectedImageNode(lexical.nodes)
    : null;
  const selectedImageSrc =
    selectedImageNode && typeof selectedImageNode.src === "string" ? selectedImageNode.src : null;
  const markdown = exportClipboardNodesToMarkdown(lexical.nodes);
  const exportedHtml = exportSelectionToHtml(editor, selection);

  return {
    assetUrls,
    html: exportedHtml,
    imageAssetUrl: selectedImageSrc?.startsWith("assets://") ? selectedImageSrc : null,
    markdown,
    nodes: lexical.nodes,
    sourceBlockId: blockId,
  };
}

async function createClipboardDataFromSnapshot(
  snapshot: NonNullable<ReturnType<typeof createClipboardSnapshotFromSelection>>,
  resolveAssetsClient: ResolveAssetsClient,
): Promise<BlockEditorClipboardWriteRequest> {
  const resolvedAssets =
    snapshot.assetUrls.length > 0
      ? await resolveAssetsClient({ assetUrls: snapshot.assetUrls })
      : { assets: [] };
  const assetUrlMap = createAssetUrlMap(resolvedAssets);
  const imageFileUrl = snapshot.imageAssetUrl ? assetUrlMap.get(snapshot.imageAssetUrl) : undefined;
  const externalNodes = rewriteClipboardAssetUrls(snapshot.nodes, assetUrlMap);
  const html = assetUrlMap.size > 0 ? exportClipboardNodesToHtml(externalNodes) : snapshot.html;

  return {
    html,
    ...(imageFileUrl ? { imageFileUrl } : {}),
    payload: createPayload(snapshot.sourceBlockId, snapshot.nodes),
    text: assetUrlMap.size > 0 ? exportClipboardNodesToMarkdown(externalNodes) : snapshot.markdown,
  };
}

export async function createClipboardDataFromCurrentSelection(
  editor: LexicalEditor,
  blockId: string,
  resolveAssetsClient: ResolveAssetsClient = resolveAsset,
): Promise<BlockEditorClipboardWriteRequest | null> {
  const snapshot = editor.read(() => {
    const selection = $getSelection();
    if (selection === null) {
      return null;
    }

    return createClipboardSnapshotFromSelection(editor, blockId, selection, {
      includeImageFileUrl: true,
    });
  });

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssetsClient) : null;
}

export async function createClipboardDataFromDocument(
  editor: LexicalEditor,
  blockId: string,
  resolveAssetsClient: ResolveAssetsClient = resolveAsset,
): Promise<BlockEditorClipboardWriteRequest | null> {
  let selection: BaseSelection | null = null;

  editor.update(
    () => {
      const previousSelection = $getSelection()?.clone() ?? null;
      selection = $selectAll();
      $setSelection(previousSelection);
    },
    { discrete: true },
  );

  if (selection === null) {
    return null;
  }
  const documentSelection = selection;

  const snapshot = editor.read(() =>
    createClipboardSnapshotFromSelection(editor, blockId, documentSelection, {
      includeImageFileUrl: false,
    }),
  );

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssetsClient) : null;
}
