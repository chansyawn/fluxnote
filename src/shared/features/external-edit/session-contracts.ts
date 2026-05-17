import { z } from "zod";

export const externalEditTriggerSchema = z.object({
  cwd: z.string().min(1),
  requestedFilePath: z.string().min(1),
  source: z.literal("cli"),
  targetFilePath: z.string().min(1),
});
export type ExternalEditTrigger = z.infer<typeof externalEditTriggerSchema>;

export const externalEditSessionSchema = z.object({
  editId: z.string().min(1),
  blockId: z.string().min(1),
  createdAt: z.string(),
  trigger: externalEditTriggerSchema,
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
