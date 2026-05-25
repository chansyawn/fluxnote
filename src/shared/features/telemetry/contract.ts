import { z } from "zod";

const voidSchema = z.undefined();

export const telemetryProcessSchema = z.enum(["main", "renderer"]);
export const telemetryEventNameSchema = z.enum(["app_started"]);

export const telemetryBootstrapSchema = z.object({
  anonId: z.string().min(1),
  enabled: z.boolean(),
  posthogHost: z.string().min(1).nullable(),
  posthogKey: z.string().min(1).nullable(),
});

export const telemetryContract = {
  commands: {
    "telemetry.bootstrap": {
      input: voidSchema,
      output: telemetryBootstrapSchema,
    },
  },
  events: {
    "telemetry.changed": telemetryBootstrapSchema,
  },
} as const;

export type TelemetryBootstrap = z.infer<typeof telemetryBootstrapSchema>;
export type TelemetryEventName = z.infer<typeof telemetryEventNameSchema>;
export type TelemetryProcess = z.infer<typeof telemetryProcessSchema>;
