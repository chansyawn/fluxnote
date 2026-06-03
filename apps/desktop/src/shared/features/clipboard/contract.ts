import { z } from "zod";

const voidSchema = z.undefined();

export const blockEditorClipboardWriteRequestSchema = z.object({
  html: z.string(),
  imageFileUrl: z.string().optional(),
  text: z.string(),
});

export const clipboardContract = {
  commands: {
    "clipboard.write": {
      input: blockEditorClipboardWriteRequestSchema,
      output: voidSchema,
    },
  },
  events: {},
} as const;
