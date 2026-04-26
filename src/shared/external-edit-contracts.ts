import { z } from "zod";

export const externalEditSessionSchema = z.object({
  editId: z.string().min(1),
  blockId: z.string().min(1),
  createdAt: z.string(),
});
export type ExternalEditSession = z.infer<typeof externalEditSessionSchema>;

export const externalEditResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("submitted"),
    blockId: z.string().min(1),
    content: z.string(),
  }),
  z.object({
    status: z.literal("cancelled"),
    blockId: z.string().min(1),
  }),
]);
export type ExternalEditResult = z.infer<typeof externalEditResultSchema>;
