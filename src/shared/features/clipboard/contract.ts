import {
  blockEditorClipboardReadResultSchema,
  blockEditorClipboardWriteRequestSchema,
} from "@shared/features/block-editor/clipboard";
import { z } from "zod";

const voidSchema = z.undefined();

export const clipboardContract = {
  commands: {
    "clipboard.read": {
      input: voidSchema,
      output: blockEditorClipboardReadResultSchema,
    },
    "clipboard.write": {
      input: blockEditorClipboardWriteRequestSchema,
      output: voidSchema,
    },
  },
  events: {},
} as const;
