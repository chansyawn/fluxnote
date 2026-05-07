import type { SerializedLexicalNode } from "lexical";
import { z } from "zod";

export const BLOCK_EDITOR_CLIPBOARD_MIME = "application/x-fluxnote-block-editor";

export type ClipboardSerializedNode = SerializedLexicalNode &
  Record<string, unknown> & {
    children?: ClipboardSerializedNode[];
    src?: unknown;
  };

const clipboardSerializedNodeSchema: z.ZodType<ClipboardSerializedNode> = z.lazy(() =>
  z
    .object({
      children: z.array(clipboardSerializedNodeSchema).optional(),
      src: z.unknown().optional(),
      type: z.string(),
      version: z.number(),
    })
    .catchall(z.unknown()),
);

export const blockEditorClipboardPayloadSchema = z.object({
  nodes: z.array(clipboardSerializedNodeSchema),
  sourceBlockId: z.string().min(1),
  version: z.literal(1),
});

export const blockEditorClipboardWriteRequestSchema = z.object({
  html: z.string(),
  imageFileUrl: z.string().optional(),
  payload: blockEditorClipboardPayloadSchema,
  text: z.string(),
});

export const blockEditorClipboardReadResultSchema = z.object({
  payload: blockEditorClipboardPayloadSchema.nullable(),
});

export type BlockEditorClipboardPayload = z.infer<typeof blockEditorClipboardPayloadSchema>;
export type BlockEditorClipboardReadResult = z.infer<typeof blockEditorClipboardReadResultSchema>;
export type BlockEditorClipboardWriteRequest = z.infer<
  typeof blockEditorClipboardWriteRequestSchema
>;
