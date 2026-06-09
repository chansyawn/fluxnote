import { describe, expect, it } from "vite-plus/test";

import { externalEditTriggerSchema } from "./session-contracts";

describe("external edit session contracts", () => {
  it("accepts CLI external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      cwd: "/workspace",
      requestedFilePath: "prompt.md",
      source: "cli",
      targetFilePath: "/workspace/prompt.md",
    });

    expect(trigger.source).toBe("cli");
  });

  it("accepts macOS Accessibility external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      appBundleId: "com.example.App",
      appName: "Example",
      elementRole: "AXTextArea",
      processId: 123,
      source: "mac_accessibility",
    });

    expect(trigger).toMatchObject({
      source: "mac_accessibility",
    });
  });
});
