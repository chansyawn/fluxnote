import { z } from "zod";

export const gitRepositoryInfoSchema = z.object({
  branch: z.string().min(1).nullable(),
  root: z.string().min(1),
});
export type GitRepositoryInfo = z.infer<typeof gitRepositoryInfoSchema>;

export const cliExternalEditTriggerSchema = z.object({
  cwd: z.string().min(1),
  git: gitRepositoryInfoSchema.nullable(),
  requestedFilePath: z.string().min(1),
  source: z.literal("cli"),
  targetFilePath: z.string().min(1),
});

export const focusedAppExternalEditTriggerSchema = z.object({
  appBundleId: z.string().min(1).nullable(),
  appIcon: z.string().min(1).nullable(),
  appName: z.string().min(1).nullable(),
  elementRole: z.string().min(1).nullable(),
  mode: z.enum(["copy_only", "write_back"]),
  processId: z.number().int().nonnegative(),
  source: z.literal("focused_app"),
});

export const browserExternalEditTriggerSchema = z.object({
  appBundleId: z.string().min(1).nullable(),
  appIcon: z.string().min(1).nullable(),
  appName: z.string().min(1).nullable(),
  mode: z.enum(["copy_only", "write_back"]),
  processId: z.number().int().nonnegative(),
  source: z.literal("browser"),
  title: z.string().min(1).nullable(),
  url: z.string().min(1).nullable(),
});

export const externalEditTriggerSchema = z.discriminatedUnion("source", [
  cliExternalEditTriggerSchema,
  focusedAppExternalEditTriggerSchema,
  browserExternalEditTriggerSchema,
]);
export type ExternalEditTrigger = z.infer<typeof externalEditTriggerSchema>;
export type CliExternalEditTrigger = z.infer<typeof cliExternalEditTriggerSchema>;
export type FocusedAppExternalEditTrigger = z.infer<typeof focusedAppExternalEditTriggerSchema>;
export type BrowserExternalEditTrigger = z.infer<typeof browserExternalEditTriggerSchema>;

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
