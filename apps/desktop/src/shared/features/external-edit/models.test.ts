import { describe, expect, it } from "vite-plus/test";

import { externalEditTriggerSchema } from "./models";

describe("external edit models", () => {
  it("accepts CLI external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      cwd: "/workspace",
      requestedFilePath: "prompt.md",
      source: "cli",
      targetFilePath: "/workspace/prompt.md",
    });

    expect(trigger.source).toBe("cli");
  });

  it("accepts focused app external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      appBundleId: "com.example.App",
      appName: "Example",
      elementRole: "AXTextArea",
      mode: "write_back",
      processId: 123,
      source: "focused_app",
    });

    expect(trigger).toMatchObject({
      source: "focused_app",
      mode: "write_back",
    });
  });

  it("accepts focused app copy-only external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      appBundleId: null,
      appName: null,
      elementRole: null,
      mode: "copy_only",
      processId: 0,
      source: "focused_app",
    });

    expect(trigger).toMatchObject({
      source: "focused_app",
      mode: "copy_only",
    });
  });
});
