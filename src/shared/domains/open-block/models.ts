import { z } from "zod";

export const openBlockPendingSchema = z.object({
  blockId: z.string().nullable(),
});
