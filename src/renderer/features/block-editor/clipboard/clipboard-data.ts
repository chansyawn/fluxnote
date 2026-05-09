import { $generateJSONFromSelectedNodes, $getHtmlContent } from "@lexical/clipboard";
import { withDOM } from "@lexical/headless/dom";
import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";
import {
  $getSelection,
  $getRoot,
  $selectAll,
  $setSelection,
  $isElementNode,
  type BaseSelection,
  type LexicalEditor,
  type LexicalNode,
  type SerializedEditorState,
} from "lexical";

import { createHeadlessMarkdownEditor } from "../core/headless-markdown-editor";
import { exportEditorStateToMarkdown } from "../core/markdown-editor-io";
import type { BlockEditorClipboardWriteData, BlockEditorRuntime } from "../core/types";
import { collectClipboardAssetUrls, rewriteClipboardAssetUrls } from "./clipboard-assets";

type ClipboardSerializedRoot = SerializedEditorState<ClipboardSerializedNode>["root"];

type ResolveAssets = BlockEditorRuntime["assets"]["resolve"];
type ResolveAssetResult = Awaited<ReturnType<ResolveAssets>>;

const ROOT_BLOCK_NODE_TYPES = new Set([
  "code",
  "heading",
  "horizontalrule",
  "list",
  "paragraph",
  "placeholder-block",
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

function exportClipboardNodesToMarkdown(nodes: ClipboardSerializedNode[]): string {
  const editor = createHeadlessMarkdownEditor("BlockEditorClipboardExport");
  const editorState = editor.parseEditorState(createEditorStateFromClipboardNodes(nodes));
  return exportEditorStateToMarkdown(editorState);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteClipboardHtmlAssetUrls(html: string, assetUrlMap: Map<string, string>): string {
  let nextHtml = html;

  for (const [assetUrl, fileUrl] of assetUrlMap) {
    const assetUrlPattern = escapeRegExp(assetUrl);
    nextHtml = nextHtml.replaceAll(
      new RegExp(`(<img\\b[^>]*\\bsrc=)(["'])${assetUrlPattern}\\2`, "gi"),
      (_match, prefix: string, quote: string) => `${prefix}${quote}${fileUrl}${quote}`,
    );
  }

  return nextHtml;
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

function createClipboardSnapshotFromSelection(
  editor: LexicalEditor,
  selection: BaseSelection,
  options: { includeImageFileUrl: boolean },
): {
  assetUrls: string[];
  html: string;
  imageAssetUrl: string | null;
  markdown: string;
  nodes: ClipboardSerializedNode[];
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
  };
}

function serializeClipboardNode(node: LexicalNode): ClipboardSerializedNode {
  const serialized = node.exportJSON() as ClipboardSerializedNode;
  if ($isElementNode(node)) {
    serialized.children = node.getChildren().map(serializeClipboardNode);
  }

  return serialized;
}

function createClipboardSnapshotFromDocument(
  editor: LexicalEditor,
  selection: BaseSelection,
): {
  assetUrls: string[];
  html: string;
  imageAssetUrl: string | null;
  markdown: string;
  nodes: ClipboardSerializedNode[];
} | null {
  const nodes = $getRoot().getChildren().map(serializeClipboardNode);
  if (nodes.length === 0) {
    return null;
  }

  return {
    assetUrls: collectClipboardAssetUrls(nodes),
    html: exportSelectionToHtml(editor, selection),
    imageAssetUrl: null,
    markdown: exportClipboardNodesToMarkdown(nodes),
    nodes,
  };
}

async function createClipboardDataFromSnapshot(
  snapshot: NonNullable<ReturnType<typeof createClipboardSnapshotFromSelection>>,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData> {
  const resolvedAssets: ResolveAssetResult =
    snapshot.assetUrls.length > 0
      ? await resolveAssets({ assetUrls: snapshot.assetUrls })
      : { assets: [] };
  const assetUrlMap = createAssetUrlMap(resolvedAssets);
  const imageFileUrl = snapshot.imageAssetUrl ? assetUrlMap.get(snapshot.imageAssetUrl) : undefined;
  const externalNodes = rewriteClipboardAssetUrls(snapshot.nodes, assetUrlMap);
  // Keep file:// URLs out of the DOM export path. Chromium attempts to load local
  // resources when an img element receives a file URL, even if the element only
  // exists for clipboard serialization, so rewrite the final HTML string instead.
  const html =
    assetUrlMap.size > 0
      ? rewriteClipboardHtmlAssetUrls(snapshot.html, assetUrlMap)
      : snapshot.html;

  return {
    html,
    ...(imageFileUrl ? { imageFileUrl } : {}),
    nodes: snapshot.nodes,
    text: assetUrlMap.size > 0 ? exportClipboardNodesToMarkdown(externalNodes) : snapshot.markdown,
  };
}

export async function createClipboardDataFromCurrentSelection(
  editor: LexicalEditor,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData | null> {
  const snapshot = withDOM(() =>
    editor.read(() => {
      const selection = $getSelection();
      if (selection === null) {
        return null;
      }

      return createClipboardSnapshotFromSelection(editor, selection, {
        includeImageFileUrl: true,
      });
    }),
  );

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssets) : null;
}

export async function createClipboardDataFromDocument(
  editor: LexicalEditor,
  resolveAssets: ResolveAssets,
): Promise<BlockEditorClipboardWriteData | null> {
  const snapshot = withDOM(() => {
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

    return editor.read(() => createClipboardSnapshotFromDocument(editor, documentSelection));
  });

  return snapshot ? await createClipboardDataFromSnapshot(snapshot, resolveAssets) : null;
}
