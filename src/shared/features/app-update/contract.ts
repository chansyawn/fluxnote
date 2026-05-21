import { z } from "zod";

const voidSchema = z.undefined();

export const appUpdateCheckSourceSchema = z.enum(["automatic", "manual"]);
export type AppUpdateCheckSource = z.infer<typeof appUpdateCheckSourceSchema>;

export const appUpdateStateSchema = z.enum([
  "idle",
  "checking",
  "downloading",
  "ready",
  "unavailable",
  "error",
]);
export type AppUpdateState = z.infer<typeof appUpdateStateSchema>;

export const appUpdateStatusSchema = z.object({
  availableVersion: z.string().optional(),
  currentVersion: z.string(),
  errorMessage: z.string().optional(),
  isSupported: z.boolean(),
  lastCheckedAt: z.string().optional(),
  lastCheckSource: appUpdateCheckSourceSchema.optional(),
  platform: z.string(),
  releaseName: z.string().optional(),
  state: appUpdateStateSchema,
});
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
