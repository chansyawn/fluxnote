import { describe, expect, it } from "vite-plus/test";

import { externalEditOriginSchema, externalEditSubmissionSchema } from "./models";

describe("external edit models", () => {
  it("accepts CLI external edit origins", () => {
    const origin = externalEditOriginSchema.parse({
      cwd: "/workspace",
      git: { branch: "main", root: "/workspace" },
      kind: "cli",
      requestedFilePath: "prompt.md",
      targetFilePath: "/workspace/prompt.md",
    });

    expect(origin.kind).toBe("cli");
  });

  it("accepts CLI origins outside a git repository", () => {
    const origin = externalEditOriginSchema.parse({
      cwd: "/workspace",
      git: null,
      kind: "cli",
      requestedFilePath: "prompt.md",
      targetFilePath: "/workspace/prompt.md",
    });

    expect(origin).toMatchObject({ git: null, kind: "cli" });
  });

  it("accepts Mac app external edit origins", () => {
    const origin = externalEditOriginSchema.parse({
      app: {
        bundleId: "com.example.App",
        icon: "data:image/png;base64,ICON",
        name: "Example",
        processId: 123,
      },
      elementRole: "AXTextArea",
      kind: "macApp",
    });

    expect(origin).toMatchObject({
      kind: "macApp",
    });
  });

  it("accepts browser external edit origins", () => {
    const origin = externalEditOriginSchema.parse({
      app: {
        bundleId: "com.google.Chrome",
        icon: null,
        name: "Google Chrome",
        processId: 321,
      },
      elementRole: "AXTextArea",
      kind: "browser",
      page: {
        title: "Example Page",
        url: "https://example.com/page",
      },
    });

    expect(origin).toMatchObject({
      kind: "browser",
      page: { title: "Example Page", url: "https://example.com/page" },
    });
  });

  it("accepts direct and clipboard submissions", () => {
    expect(externalEditSubmissionSchema.parse({ transport: "direct" })).toEqual({
      transport: "direct",
    });
    expect(externalEditSubmissionSchema.parse({ transport: "clipboard" })).toEqual({
      transport: "clipboard",
    });
  });
});
