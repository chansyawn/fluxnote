import type { SerializedLexicalNode } from "lexical";
import { z } from "zod";

export const BLOCK_EDITOR_CLIPBOARD_MIME = "application/x-fluxnote-block-editor";
export const BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL = "image/file-url";

export const blockEditorClipboardDataSchema = z.object({
  [BLOCK_EDITOR_CLIPBOARD_MIME]: z.string(),
  [BLOCK_EDITOR_CLIPBOARD_IMAGE_FILE_URL]: z.string().optional(),
  "text/html": z.string(),
  "text/plain": z.string(),
});

export const blockEditorClipboardReadResultSchema = z.object({
  data: blockEditorClipboardDataSchema.nullable(),
});

export type ClipboardSerializedNode = SerializedLexicalNode &
  Record<string, unknown> & {
    children?: ClipboardSerializedNode[];
    src?: unknown;
  };

export type BlockEditorClipboardData = z.infer<typeof blockEditorClipboardDataSchema>;
export type BlockEditorClipboardReadResult = z.infer<typeof blockEditorClipboardReadResultSchema>;
