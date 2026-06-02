import { z } from "zod";

export const openBlockTargetSchema = z.object({
  blockId: z.string().min(1),
});

export const openBlockPendingSchema = z.object({
  target: openBlockTargetSchema.nullable(),
});
