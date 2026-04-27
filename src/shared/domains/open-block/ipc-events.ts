import { z } from "zod";

export const openBlockRequestedPayloadSchema = z.object({
  blockId: z.string(),
});
export type OpenBlockRequestedPayload = z.infer<typeof openBlockRequestedPayloadSchema>;

export const openBlockIpcEventContracts = {
  openBlockRequested: {
    channel: "fluxnote:event:open-block://requested",
    payload: openBlockRequestedPayloadSchema,
  },
} as const;
