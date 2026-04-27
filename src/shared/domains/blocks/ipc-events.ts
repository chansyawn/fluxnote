import { z } from "zod";

export const autoArchiveStateChangedPayloadSchema = z.object({
  archivedCount: z.number(),
  pendingCount: z.number(),
  windowVisible: z.boolean(),
});
export type AutoArchiveStateChangedPayload = z.infer<typeof autoArchiveStateChangedPayloadSchema>;

export const blocksIpcEventContracts = {
  autoArchiveStateChanged: {
    channel: "fluxnote:event:auto-archive://state-changed",
    payload: autoArchiveStateChangedPayloadSchema,
  },
} as const;
