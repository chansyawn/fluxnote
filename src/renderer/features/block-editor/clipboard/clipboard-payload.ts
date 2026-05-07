export {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  type BlockEditorClipboardData,
  type ClipboardSerializedNode,
} from "@shared/features/block-editor/clipboard";

import type { ClipboardSerializedNode } from "@shared/features/block-editor/clipboard";

export interface BlockEditorClipboardPayload {
  assets: Array<{
    assetUrl: string;
    fileUrl: string;
  }>;
  markdown: string;
  nodes: ClipboardSerializedNode[];
  sourceBlockId: string;
}

export function parseBlockEditorClipboardPayload(
  value: string,
): BlockEditorClipboardPayload | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const payload = parsed as Partial<BlockEditorClipboardPayload>;
    if (
      typeof payload.sourceBlockId !== "string" ||
      !Array.isArray(payload.nodes) ||
      !Array.isArray(payload.assets) ||
      typeof payload.markdown !== "string"
    ) {
      return null;
    }

    return payload as BlockEditorClipboardPayload;
  } catch {
    return null;
  }
}
