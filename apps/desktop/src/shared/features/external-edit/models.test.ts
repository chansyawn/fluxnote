import { describe, expect, it } from "vite-plus/test";

import { externalEditTriggerSchema } from "./models";

describe("external edit models", () => {
  it("accepts CLI external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      cwd: "/workspace",
      git: { branch: "main", root: "/workspace" },
      requestedFilePath: "prompt.md",
      source: "cli",
      targetFilePath: "/workspace/prompt.md",
    });

    expect(trigger.source).toBe("cli");
  });

  it("accepts CLI triggers outside a git repository", () => {
    const trigger = externalEditTriggerSchema.parse({
      cwd: "/workspace",
      git: null,
      requestedFilePath: "prompt.md",
      source: "cli",
      targetFilePath: "/workspace/prompt.md",
    });

    expect(trigger).toMatchObject({ git: null, source: "cli" });
  });

  it("accepts focused app external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      appBundleId: "com.example.App",
      appIcon: "data:image/png;base64,ICON",
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
      appIcon: null,
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

  it("accepts browser external edit triggers", () => {
    const trigger = externalEditTriggerSchema.parse({
      appBundleId: "com.google.Chrome",
      appIcon: null,
      appName: "Google Chrome",
      faviconDataUrl: "data:image/png;base64,FAVICON",
      mode: "write_back",
      processId: 321,
      source: "browser",
      title: "Example Page",
      url: "https://example.com/page",
    });

    expect(trigger).toMatchObject({
      source: "browser",
      title: "Example Page",
      url: "https://example.com/page",
    });
  });
});
