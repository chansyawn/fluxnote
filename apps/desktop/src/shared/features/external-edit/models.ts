import { z } from "zod";

export const gitRepositoryInfoSchema = z.object({
  branch: z.string().min(1).nullable(),
  root: z.string().min(1),
});
export type GitRepositoryInfo = z.infer<typeof gitRepositoryInfoSchema>;

export const externalAppMetadataSchema = z.object({
  bundleId: z.string().min(1).nullable(),
  icon: z.string().min(1).nullable(),
  name: z.string().min(1).nullable(),
  processId: z.number().int().nonnegative(),
});
export type ExternalAppMetadata = z.infer<typeof externalAppMetadataSchema>;

export const cliExternalEditOriginSchema = z.object({
  cwd: z.string().min(1),
  git: gitRepositoryInfoSchema.nullable(),
  kind: z.literal("cli"),
  requestedFilePath: z.string().min(1),
  targetFilePath: z.string().min(1),
});

export const macAppExternalEditOriginSchema = z.object({
  app: externalAppMetadataSchema,
  elementRole: z.string().min(1).nullable(),
  kind: z.literal("macApp"),
});

export const browserExternalEditOriginSchema = z.object({
  app: externalAppMetadataSchema,
  elementRole: z.string().min(1).nullable(),
  kind: z.literal("browser"),
  page: z.object({
    title: z.string().min(1).nullable(),
    url: z.string().min(1).nullable(),
  }),
});

export const externalEditOriginSchema = z.discriminatedUnion("kind", [
  cliExternalEditOriginSchema,
  macAppExternalEditOriginSchema,
  browserExternalEditOriginSchema,
]);
export type ExternalEditOrigin = z.infer<typeof externalEditOriginSchema>;
export type CliExternalEditOrigin = z.infer<typeof cliExternalEditOriginSchema>;
export type MacAppExternalEditOrigin = z.infer<typeof macAppExternalEditOriginSchema>;
export type BrowserExternalEditOrigin = z.infer<typeof browserExternalEditOriginSchema>;

export const externalEditSubmissionSchema = z.discriminatedUnion("transport", [
  z.object({ transport: z.literal("direct") }),
  z.object({ transport: z.literal("clipboard") }),
]);
export type ExternalEditSubmission = z.infer<typeof externalEditSubmissionSchema>;

export const externalEditSessionSchema = z.object({
  blockId: z.string().min(1),
  createdAt: z.string(),
  id: z.string().min(1),
  origin: externalEditOriginSchema,
  submission: externalEditSubmissionSchema,
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
