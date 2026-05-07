import type { SerializedLexicalNode } from "lexical";

export const BLOCK_EDITOR_CLIPBOARD_MIME = "application/x-fluxnote-block-editor";

export type ClipboardSerializedNode = SerializedLexicalNode &
  Record<string, unknown> & {
    children?: ClipboardSerializedNode[];
    src?: unknown;
  };

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
