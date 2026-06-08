import { z } from "zod";

export const cliExternalEditTriggerSchema = z.object({
  cwd: z.string().min(1),
  requestedFilePath: z.string().min(1),
  source: z.literal("cli"),
  targetFilePath: z.string().min(1),
});

export const macAccessibilityExternalEditTriggerSchema = z.object({
  appBundleId: z.string().min(1).nullable(),
  appName: z.string().min(1).nullable(),
  editScope: z.enum(["selection", "full_value"]),
  elementRole: z.string().min(1).nullable(),
  processId: z.number().int().nonnegative(),
  selectedRange: z
    .object({
      length: z.number().int().nonnegative(),
      location: z.number().int().nonnegative(),
    })
    .nullable(),
  source: z.literal("mac_accessibility"),
});

export const externalEditTriggerSchema = z.discriminatedUnion("source", [
  cliExternalEditTriggerSchema,
  macAccessibilityExternalEditTriggerSchema,
]);
export type ExternalEditTrigger = z.infer<typeof externalEditTriggerSchema>;
export type CliExternalEditTrigger = z.infer<typeof cliExternalEditTriggerSchema>;
export type MacAccessibilityExternalEditTrigger = z.infer<
  typeof macAccessibilityExternalEditTriggerSchema
>;

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
