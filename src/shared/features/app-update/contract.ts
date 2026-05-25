import { z } from "zod";

const voidSchema = z.undefined();

export const appUpdateCheckSourceSchema = z.enum(["automatic", "manual"]);
export type AppUpdateCheckSource = z.infer<typeof appUpdateCheckSourceSchema>;

export const appUpdateLastCheckOutcomeSchema = z.enum([
  "update-ready",
  "up-to-date",
  "ready-latest",
  "newer-update",
  "failed",
]);
export type AppUpdateLastCheckOutcome = z.infer<typeof appUpdateLastCheckOutcomeSchema>;

export const appUpdateLastCheckSchema = z.object({
  checkedAt: z.string(),
  errorMessage: z.string().optional(),
  outcome: appUpdateLastCheckOutcomeSchema,
  source: appUpdateCheckSourceSchema,
});
export type AppUpdateLastCheck = z.infer<typeof appUpdateLastCheckSchema>;

export const appUpdateStateSchema = z.enum([
  "idle",
  "checking",
  "downloading",
  "ready",
  "up-to-date",
  "unsupported",
  "error",
]);
export type AppUpdateState = z.infer<typeof appUpdateStateSchema>;

const supportedStatusBaseSchema = z.object({
  currentVersion: z.string(),
  isSupported: z.literal(true),
  lastCheck: appUpdateLastCheckSchema.optional(),
  platform: z.string(),
});

export const appUpdateStatusSchema = z.discriminatedUnion("state", [
  supportedStatusBaseSchema.extend({
    state: z.literal("idle"),
  }),
  supportedStatusBaseSchema.extend({
    state: z.literal("checking"),
  }),
  supportedStatusBaseSchema.extend({
    state: z.literal("downloading"),
  }),
  supportedStatusBaseSchema.extend({
    availableVersion: z.string().optional(),
    releaseName: z.string().optional(),
    state: z.literal("ready"),
  }),
  supportedStatusBaseSchema.extend({
    state: z.literal("up-to-date"),
  }),
  supportedStatusBaseSchema.extend({
    errorMessage: z.string(),
    state: z.literal("error"),
  }),
  z.object({
    currentVersion: z.string(),
    isSupported: z.literal(false),
    platform: z.string(),
    state: z.literal("unsupported"),
    unsupportedReason: z.enum(["not-packaged", "platform"]),
  }),
]);
export type AppUpdateStatus = z.infer<typeof appUpdateStatusSchema>;

export const appUpdateCheckRequestSchema = z.object({
  source: appUpdateCheckSourceSchema,
});
export type AppUpdateCheckRequest = z.infer<typeof appUpdateCheckRequestSchema>;

export const appUpdateContract = {
  commands: {
    "app-update.check": {
      input: appUpdateCheckRequestSchema,
      output: appUpdateStatusSchema,
    },
    "app-update.get-status": {
      input: voidSchema,
      output: appUpdateStatusSchema,
    },
    "app-update.restart-and-install": {
      input: voidSchema,
      output: voidSchema,
    },
  },
  events: {
    "app-update.changed": appUpdateStatusSchema,
  },
} as const;
