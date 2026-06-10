import { describe, expect, it } from "vite-plus/test";

import { systemPermissionRequestSchema, systemPermissionStatusSchema } from "./contract";

describe("system permissions contract", () => {
  it("accepts macOS Accessibility permission requests", () => {
    expect(systemPermissionRequestSchema.parse({ permission: "macos_accessibility" })).toEqual({
      permission: "macos_accessibility",
    });
  });

  it("rejects unsupported permission keys", () => {
    expect(() => {
      systemPermissionRequestSchema.parse({ permission: "camera" });
    }).toThrow();
  });

  it("accepts macOS Accessibility permission status", () => {
    expect(
      systemPermissionStatusSchema.parse({
        granted: true,
        permission: "macos_accessibility",
        supported: true,
      }),
    ).toEqual({
      granted: true,
      permission: "macos_accessibility",
      supported: true,
    });
  });
});
