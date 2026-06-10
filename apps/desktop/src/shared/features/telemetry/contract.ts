import { z } from "zod";

const voidSchema = z.undefined();

export const telemetryProcessSchema = z.enum(["main", "renderer"]);
export const blockCreatedSourceSchema = z.enum([
  "workspace_titlebar",
  "workspace_empty_state",
  "workspace_shortcut",
  "quick_create_shortcut",
  "focused_app_external_edit",
  "cli_add_text",
  "cli_add_file",
  "cli_external_edit",
]);
export const telemetryEventNameSchema = z.enum(["app_started", "app_show", "block_created"]);
export const blockCreatedPropertiesSchema = z.object({
  source: blockCreatedSourceSchema,
});

export const telemetryBootstrapSchema = z.object({
  anonId: z.string().min(1),
  appVersion: z.string().min(1),
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
export type BlockCreatedProperties = z.infer<typeof blockCreatedPropertiesSchema>;
export type BlockCreatedSource = z.infer<typeof blockCreatedSourceSchema>;
export type TelemetryEventName = z.infer<typeof telemetryEventNameSchema>;
export type TelemetryProcess = z.infer<typeof telemetryProcessSchema>;
