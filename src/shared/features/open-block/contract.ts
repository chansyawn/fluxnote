import { z } from "zod";

import { openBlockPendingSchema, openBlockTargetSchema } from "./models";

const voidSchema = z.undefined();

export const openBlockRequestedPayloadSchema = openBlockTargetSchema;
export type OpenBlockRequestedPayload = z.infer<typeof openBlockRequestedPayloadSchema>;

export const openBlockContract = {
  commands: {
    "open-block.acknowledge-pending": {
      input: z.object({
        blockId: z.string().min(1),
      }),
      output: voidSchema,
    },
    "open-block.read-pending": {
      input: voidSchema,
      output: openBlockPendingSchema,
    },
  },
  events: {
    "open-block.requested": openBlockRequestedPayloadSchema,
  },
} as const;
