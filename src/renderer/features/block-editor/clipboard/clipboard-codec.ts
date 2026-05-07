export {
  BLOCK_EDITOR_CLIPBOARD_MIME,
  blockEditorClipboardPayloadSchema,
  decodeBlockEditorClipboardHtml,
  encodeBlockEditorClipboardHtml,
  stripBlockEditorClipboardHtmlMetadata,
  type BlockEditorClipboardPayload,
  type BlockEditorClipboardWriteRequest,
  type ClipboardSerializedNode,
} from "@shared/features/block-editor/clipboard";

import { blockEditorClipboardPayloadSchema } from "@shared/features/block-editor/clipboard";
import type { BlockEditorClipboardPayload } from "@shared/features/block-editor/clipboard";

export function stringifyBlockEditorClipboardPayload(payload: BlockEditorClipboardPayload): string {
  return JSON.stringify(payload);
}

export function parseBlockEditorClipboardPayload(
  value: string,
): BlockEditorClipboardPayload | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    const result = blockEditorClipboardPayloadSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
