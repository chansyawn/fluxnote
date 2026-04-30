import { z } from "zod";

import { openBlockPendingSchema } from "./models";

const voidSchema = z.undefined();

export const openBlockIpcCommandContracts = {
  openBlockPendingAcknowledge: {
    channel: "fluxnotes:open-block:pending-acknowledge",
    request: z.object({
      blockId: z.string().min(1),
    }),
    response: voidSchema,
  },
  openBlockPendingRead: {
    channel: "fluxnotes:open-block:pending-read",
    request: voidSchema,
    response: openBlockPendingSchema,
  },
} as const;
