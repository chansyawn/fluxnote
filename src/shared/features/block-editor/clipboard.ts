import { z } from "zod";

export const blockEditorClipboardWriteRequestSchema = z.object({
  html: z.string(),
  imageFileUrl: z.string().optional(),
  text: z.string(),
});

export type BlockEditorClipboardWriteRequest = z.infer<
  typeof blockEditorClipboardWriteRequestSchema
>;
