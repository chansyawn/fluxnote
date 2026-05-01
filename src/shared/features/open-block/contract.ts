import { z } from "zod";

import { openBlockPendingSchema } from "./models";

const voidSchema = z.undefined();

export const openBlockRequestedPayloadSchema = z.object({
  blockId: z.string(),
});
export type OpenBlockRequestedPayload = z.infer<typeof openBlockRequestedPayloadSchema>;

export const openBlockContract = {
  commands: {
    "openBlock.acknowledgePending": {
      input: z.object({
        blockId: z.string().min(1),
      }),
      output: voidSchema,
    },
    "openBlock.readPending": {
      input: voidSchema,
      output: openBlockPendingSchema,
    },
  },
  events: {
    "openBlock.requested": openBlockRequestedPayloadSchema,
  },
} as const;
