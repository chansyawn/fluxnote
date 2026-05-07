import { $generateJSONFromSelectedNodes, $getHtmlContent } from "@lexical/clipboard";
import { resolveAsset, type ResolveAssetResult } from "@renderer/clients";
import {
  $getSelection,
  $selectAll,
  $setSelection,
  type BaseSelection,
  type LexicalEditor,
  type SerializedEditorState,
} from "lexical";

import { createMarkdownEditor, exportEditorStateToMarkdown } from "../editor-state";
import {
  BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL,
  BLOCK_EDITOR_CLIPBOARD_MIME,
  type BlockEditorClipboardData,
  type BlockEditorClipboardPayload,
  type ClipboardSerializedNode,
} from "./clipboard-payload";

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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportInlineNodesToHtml(nodes: ReadonlyArray<ClipboardSerializedNode>): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return escapeHtml(typeof node.text === "string" ? node.text : "");
      }

      if (node.type === "image") {
        const src = typeof node.src === "string" ? node.src : "";
        const alt = typeof node.alt === "string" ? node.alt : "";
        const title = typeof node.title === "string" ? ` title="${escapeHtml(node.title)}"` : "";
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title}>`;
      }

      return node.children ? exportInlineNodesToHtml(node.children) : "";
    })
    .join("");
}

function exportNodesToFallbackHtml(nodes: ReadonlyArray<ClipboardSerializedNode>): string {
  return nodes
    .map((node) => {
      if (node.type === "heading") {
        const tag = typeof node.tag === "string" ? node.tag : "h1";
        return `<${tag}>${exportInlineNodesToHtml(node.children ?? [])}</${tag}>`;
      }

      if (node.children) {
        return `<p>${exportInlineNodesToHtml(node.children)}</p>`;
      }

      return exportInlineNodesToHtml([node]);
    })
    .join("");
}

function exportSelectionToHtml(editor: LexicalEditor, selection: BaseSelection): string {
  try {
    return $getHtmlContent(editor, selection);
  } catch {
    return escapeHtml(selection.getTextContent()).replaceAll("\n", "<br>");
  }
}

function collectAssetUrlsFromNodes(nodes: ReadonlyArray<ClipboardSerializedNode>): string[] {
  const assetUrls = new Set<string>();

  const visit = (node: ClipboardSerializedNode) => {
    if (node.type === "image" && typeof node.src === "string" && node.src.startsWith("assets://")) {
      assetUrls.add(node.src);
    }

    node.children?.forEach(visit);
  };

  nodes.forEach(visit);
  return Array.from(assetUrls);
}

function createAssetUrlMap(result: ResolveAssetResult): Map<string, string> {
  return new Map(result.assets.map((asset) => [asset.assetUrl, asset.fileUrl]));
}

function replaceAssetUrls(value: string, assetUrlMap: Map<string, string>): string {
  let nextValue = value;
  for (const [assetUrl, fileUrl] of assetUrlMap) {
    nextValue = nextValue.replaceAll(assetUrl, fileUrl);
  }

  return nextValue;
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
  markdown: string,
  resolvedAssets: ResolveAssetResult,
): BlockEditorClipboardPayload {
  return {
    assets: resolvedAssets.assets.map((asset) => ({
      assetUrl: asset.assetUrl,
      fileUrl: asset.fileUrl,
    })),
    markdown,
    nodes,
    sourceBlockId,
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

  const assetUrls = collectAssetUrlsFromNodes(lexical.nodes);
  const selectedImageNode = options.includeImageFileUrl
    ? findSingleSelectedImageNode(lexical.nodes)
    : null;
  const selectedImageSrc =
    selectedImageNode && typeof selectedImageNode.src === "string" ? selectedImageNode.src : null;
  const markdown = exportClipboardNodesToMarkdown(lexical.nodes);
  const exportedHtml = exportSelectionToHtml(editor, selection);
  const html =
    assetUrls.length > 0 && !assetUrls.some((assetUrl) => exportedHtml.includes(assetUrl))
      ? exportNodesToFallbackHtml(lexical.nodes)
      : exportedHtml;

  return {
    assetUrls,
    html,
    imageAssetUrl: selectedImageSrc?.startsWith("assets://") ? selectedImageSrc : null,
    markdown,
    nodes: lexical.nodes,
    sourceBlockId: blockId,
  };
}

async function createClipboardDataFromSnapshot(
  snapshot: NonNullable<ReturnType<typeof createClipboardSnapshotFromSelection>>,
  resolveAssetsClient: ResolveAssetsClient,
): Promise<BlockEditorClipboardData> {
  const resolvedAssets =
    snapshot.assetUrls.length > 0
      ? await resolveAssetsClient({ assetUrls: snapshot.assetUrls })
      : { assets: [] };
  const assetUrlMap = createAssetUrlMap(resolvedAssets);
  const imageFileUrl = snapshot.imageAssetUrl ? assetUrlMap.get(snapshot.imageAssetUrl) : undefined;
  const payload = createPayload(
    snapshot.sourceBlockId,
    snapshot.nodes,
    snapshot.markdown,
    resolvedAssets,
  );

  return {
    [BLOCK_EDITOR_CLIPBOARD_MIME]: JSON.stringify(payload),
    ...(imageFileUrl ? { [BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]: imageFileUrl } : {}),
    "text/html": replaceAssetUrls(snapshot.html, assetUrlMap),
    "text/plain": replaceAssetUrls(snapshot.markdown, assetUrlMap),
  };
}

export async function createClipboardDataFromCurrentSelection(
  editor: LexicalEditor,
  blockId: string,
  resolveAssetsClient: ResolveAssetsClient = resolveAsset,
): Promise<BlockEditorClipboardData | null> {
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
): Promise<BlockEditorClipboardData | null> {
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
