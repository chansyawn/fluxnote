import { describe, expect, it } from "vite-plus/test";

import {
  blockCreatedPropertiesSchema,
  telemetryBootstrapSchema,
  telemetryEventNameSchema,
} from "./contract";

describe("telemetry contract", () => {
  it("accepts app and Block creation event names", () => {
    expect(telemetryEventNameSchema.safeParse("app_started").success).toBe(true);
    expect(telemetryEventNameSchema.safeParse("app_show").success).toBe(true);
    expect(telemetryEventNameSchema.safeParse("block_created").success).toBe(true);
  });

  it("accepts supported Block creation sources", () => {
    expect(
      blockCreatedPropertiesSchema.safeParse({
        source: "workspace_titlebar",
      }).success,
    ).toBe(true);
    expect(
      blockCreatedPropertiesSchema.safeParse({
        source: "cli_add_file",
      }).success,
    ).toBe(true);
    expect(
      blockCreatedPropertiesSchema.safeParse({
        source: "cli_add_auto_file",
      }).success,
    ).toBe(false);
  });

  it("requires app version in bootstrap", () => {
    expect(
      telemetryBootstrapSchema.safeParse({
        anonId: "anon-1",
        appVersion: "1.0.0",
        enabled: true,
        posthogHost: "https://posthog.example",
        posthogKey: "key",
      }).success,
    ).toBe(true);
  });
});
