import { MacNativeError, type MacAccessibilityNative } from "@fluxnotes/mac-native";
import { blocks } from "@main/core/database";
import { APP_MACOS_BUNDLE_ID } from "@shared/app/app-config";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createBlockRecord, getPublicBlockById } from "../blocks/service";
import { createTestDb } from "../test-db";
import type { resolveBrowserMetadata } from "./browser-metadata";
import { createExternalEditRuntime } from "./runtime";

const paths = {
  assetPathForBlock: (id: string) => `/tmp/${id}`,
  assetsRootPath: "/tmp",
  databasePath: "/tmp/test.sqlite3",
  userDataPath: "/tmp",
};

const cliOrigin = {
  cwd: "/workspace",
  git: null,
  requestedFilePath: "block.md",
  kind: "cli" as const,
  targetFilePath: "/workspace/block.md",
};

function createMacAppOrigin() {
  return {
    app: {
      bundleId: "com.example.App",
      icon: null,
      name: "Example",
      processId: 123,
    },
    elementRole: "AXTextArea",
    kind: "macApp" as const,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function createRuntime(overrides?: {
  activateApplication?: (processId: number) => Promise<void>;
  captureText?: MacAccessibilityNative["captureText"];
  isAccessibilityTrusted?: (prompt: boolean) => boolean;
  isSupported?: () => boolean;
  resolveBrowserMetadata?: typeof resolveBrowserMetadata;
  selfTargetBundleIds?: readonly string[];
  selfTargetProcessIds?: readonly number[];
  replaceText?: (textRef: string, content: string) => Promise<void>;
}) {
  const ctx = await createTestDb();
  const macAccessibility: MacAccessibilityNative = {
    activateApplication: vi.fn(overrides?.activateApplication ?? (async () => undefined)),
    captureText: vi.fn(
      overrides?.captureText ??
        (async () => ({
          kind: "editableText" as const,
          target: {
            appBundleId: "com.example.App",
            appIcon: null,
            appName: "Example",
            elementRole: "AXTextArea",
            processId: 123,
          },
          text: "selected",
          textRef: "text-ref-1",
        })),
    ),
    releaseText: vi.fn(async () => undefined),
    isAccessibilityTrusted: vi.fn(overrides?.isAccessibilityTrusted ?? (() => true)),
    isSupported: vi.fn(overrides?.isSupported ?? (() => true)),
    replaceText: vi.fn(overrides?.replaceText ?? (async () => undefined)),
  };
  const deps = {
    clipboard: { writeText: vi.fn() },
    emitEvent: vi.fn(() => true),
    getSelfTargetProcessIds: vi.fn(() => overrides?.selfTargetProcessIds ?? []),
    macAccessibility,
    openBlockService: { requestOpen: vi.fn() },
    resolveBrowserMetadata: vi.fn(overrides?.resolveBrowserMetadata ?? (async () => null)),
    selfTargetBundleIds: new Set(overrides?.selfTargetBundleIds ?? [APP_MACOS_BUNDLE_ID]),
    telemetryService: { captureEvent: vi.fn() },
  };
  const runtime = createExternalEditRuntime({
    clipboard: deps.clipboard,
    emitEvent: deps.emitEvent,
    getDb: () => ctx.db,
    getSelfTargetProcessIds: deps.getSelfTargetProcessIds,
    macAccessibility: deps.macAccessibility,
    openBlockService: deps.openBlockService as never,
    paths,
    resolveBrowserMetadata: deps.resolveBrowserMetadata,
    selfTargetBundleIds: deps.selfTargetBundleIds,
    telemetryService: deps.telemetryService,
  });

  return {
    close: async () => {
      ctx.close();
      await ctx.cleanup();
    },
    db: ctx.db,
    deps,
    runtime,
  };
}

describe("external edit runtime", () => {
  it("creates a CLI file session and resolves it as submitted", async () => {
    const ctx = await createRuntime();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const resultPromise = ctx.runtime.createFileSession(block.id, cliOrigin);
      const session = ctx.runtime.listSessions()[0];

      expect(session).toMatchObject({
        blockId: block.id,
        origin: cliOrigin,
        submission: { transport: "direct" },
      });

      const updatedBlock = await ctx.runtime.submit(session!.id, "after");

      await expect(resultPromise).resolves.toEqual({
        blockId: block.id,
        content: "after",
        status: "submitted",
      });
      expect(updatedBlock.content).toBe("after");
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("keeps submitted edit successful when focused app write-back fails", async () => {
    const ctx = await createRuntime({
      replaceText: async () => {
        throw new Error("lost element");
      },
    });
    try {
      const session = await ctx.runtime.capture();

      const updatedBlock = await ctx.runtime.submit(session.id, "updated");

      expect(updatedBlock.content).toBe("updated");
      expect(ctx.deps.clipboard.writeText).toHaveBeenCalledWith("updated");
      expect(ctx.deps.emitEvent).toHaveBeenCalledWith("external-edit.write-back-failed", {
        blockId: session.blockId,
        id: session.id,
        reason: "lost element",
      });
      expect(ctx.deps.macAccessibility.releaseText).toHaveBeenCalledWith("text-ref-1");
    } finally {
      await ctx.close();
    }
  });

  it("resolves submitted sessions with external file urls without changing stored content", async () => {
    const ctx = await createRuntime();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const resultPromise = ctx.runtime.createFileSession(block.id, cliOrigin);
      const session = ctx.runtime.listSessions()[0]!;
      const content = [
        "Literal assets://not-an-image/photo.png",
        "",
        `![Alt](assets://${block.id}/photo.png)`,
      ].join("\n");

      const updatedBlock = await ctx.runtime.submit(session.id, content);

      expect(updatedBlock.content).toBe(content);
      await expect(resultPromise).resolves.toEqual({
        blockId: block.id,
        content: [
          "Literal assets://not-an-image/photo.png",
          "",
          `![Alt](file:///tmp/${block.id}/photo.png)`,
        ].join("\n"),
        status: "submitted",
      });
    } finally {
      await ctx.close();
    }
  });

  it("cancels a CLI file session", async () => {
    const ctx = await createRuntime();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const resultPromise = ctx.runtime.createFileSession(block.id, cliOrigin);
      const session = ctx.runtime.listSessions()[0]!;

      await ctx.runtime.cancel(session.id);

      await expect(resultPromise).resolves.toEqual({ blockId: block.id, status: "cancelled" });
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("cancels all pending sessions", async () => {
    const ctx = await createRuntime();
    try {
      const one = await createBlockRecord(ctx.db, "one");
      const two = await createBlockRecord(ctx.db, "two");
      const oneResult = ctx.runtime.createFileSession(one.id, cliOrigin);
      const twoResult = ctx.runtime.createFileSession(two.id, cliOrigin);

      ctx.runtime.cancelAll();

      await expect(oneResult).resolves.toEqual({ blockId: one.id, status: "cancelled" });
      await expect(twoResult).resolves.toEqual({ blockId: two.id, status: "cancelled" });
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("aborts pending CLI file sessions", async () => {
    const ctx = await createRuntime();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const controller = new AbortController();
      const resultPromise = ctx.runtime.createFileSession(block.id, cliOrigin, controller.signal);

      controller.abort();

      await expect(resultPromise).resolves.toEqual({ blockId: block.id, status: "cancelled" });
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("resolves submitted sessions as cancelled when submit fails", async () => {
    const ctx = await createRuntime();
    try {
      const resultPromise = ctx.runtime.createFileSession("missing", cliOrigin);
      const session = ctx.runtime.listSessions()[0]!;

      await expect(ctx.runtime.submit(session.id, "after")).rejects.toMatchObject({
        code: "BUSINESS.NOT_FOUND",
      });
      await expect(resultPromise).resolves.toEqual({ blockId: "missing", status: "cancelled" });
    } finally {
      await ctx.close();
    }
  });

  it("captures focused app text, creates a block, and starts an external edit session", async () => {
    const ctx = await createRuntime();
    try {
      const session = await ctx.runtime.capture();

      expect(session).toMatchObject({
        blockId: expect.any(String),
        origin: createMacAppOrigin(),
        submission: { transport: "direct" },
      });
      expect(ctx.deps.openBlockService.requestOpen).toHaveBeenCalledWith({
        blockId: session.blockId,
      });
      expect(ctx.deps.telemetryService.captureEvent).toHaveBeenCalledWith("block_created", {
        source: "focused_app_external_edit",
      });
      const block = await getPublicBlockById(ctx.db, session.blockId);
      expect(block.content).toBe("selected");

      await ctx.runtime.submit(session.id, "updated");

      expect(ctx.deps.macAccessibility.activateApplication).not.toHaveBeenCalled();
      expect(ctx.deps.macAccessibility.replaceText).toHaveBeenCalledWith("text-ref-1", "updated");
      expect(ctx.deps.macAccessibility.releaseText).toHaveBeenCalledWith("text-ref-1");
    } finally {
      await ctx.close();
    }
  });

  it("rejects focused app captures from the Fluxnotes bundle before creating a block", async () => {
    const ctx = await createRuntime({
      captureText: async () => ({
        kind: "editableText",
        target: {
          appBundleId: APP_MACOS_BUNDLE_ID,
          appIcon: null,
          appName: "Fluxnotes",
          elementRole: "AXTextArea",
          processId: 456,
        },
        text: "selected",
        textRef: "self-text-ref-1",
      }),
    });
    try {
      await expect(ctx.runtime.capture()).rejects.toMatchObject({
        code: "BUSINESS.EXTERNAL_EDIT_SELF_TARGET",
      });

      expect(ctx.runtime.listSessions()).toHaveLength(0);
      expect(await ctx.db.select().from(blocks).all()).toHaveLength(0);
      expect(ctx.deps.openBlockService.requestOpen).not.toHaveBeenCalled();
      expect(ctx.deps.telemetryService.captureEvent).not.toHaveBeenCalled();
      expect(ctx.deps.macAccessibility.releaseText).toHaveBeenCalledWith("self-text-ref-1");
    } finally {
      await ctx.close();
    }
  });

  it("rejects focused app captures from Fluxnotes renderer processes before creating a block", async () => {
    const ctx = await createRuntime({
      captureText: async () => ({
        kind: "editableText",
        target: {
          appBundleId: "com.example.App",
          appIcon: null,
          appName: "Fluxnotes Helper",
          elementRole: "AXTextArea",
          processId: 789,
        },
        text: "selected",
        textRef: "self-text-ref-2",
      }),
      selfTargetProcessIds: [789],
    });
    try {
      await expect(ctx.runtime.capture()).rejects.toMatchObject({
        code: "BUSINESS.EXTERNAL_EDIT_SELF_TARGET",
      });

      expect(ctx.runtime.listSessions()).toHaveLength(0);
      expect(await ctx.db.select().from(blocks).all()).toHaveLength(0);
      expect(ctx.deps.openBlockService.requestOpen).not.toHaveBeenCalled();
      expect(ctx.deps.telemetryService.captureEvent).not.toHaveBeenCalled();
      expect(ctx.deps.macAccessibility.releaseText).toHaveBeenCalledWith("self-text-ref-2");
    } finally {
      await ctx.close();
    }
  });

  it("rejects unsupported focused app capture platforms before creating a block", async () => {
    const ctx = await createRuntime({ isSupported: () => false });
    try {
      await expect(ctx.runtime.capture()).rejects.toMatchObject({
        code: "BUSINESS.UNSUPPORTED_PLATFORM",
      });
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("rejects missing Accessibility permission before creating a block", async () => {
    const ctx = await createRuntime({ isAccessibilityTrusted: () => false });
    try {
      await expect(ctx.runtime.capture()).rejects.toMatchObject({
        code: "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
      });
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("creates a clipboard session when no focused editable element is found", async () => {
    const ctx = await createRuntime({
      captureText: async () => {
        return {
          kind: "targetOnly",
          reason: "NO_EDITABLE_ELEMENT",
          target: {
            appBundleId: "com.example.App",
            appIcon: null,
            appName: "Example",
            elementRole: null,
            processId: 123,
          },
        };
      },
    });
    try {
      const session = await ctx.runtime.capture();

      expect(session).toMatchObject({
        blockId: expect.any(String),
        origin: {
          app: {
            bundleId: "com.example.App",
            icon: null,
            name: "Example",
            processId: 123,
          },
          elementRole: null,
          kind: "macApp",
        },
        submission: { transport: "clipboard" },
      });
      expect(ctx.deps.openBlockService.requestOpen).toHaveBeenCalledWith({
        blockId: session.blockId,
      });
      const block = await getPublicBlockById(ctx.db, session.blockId);
      expect(block.content).toBe("");
      expect(ctx.deps.macAccessibility.releaseText).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("activates focused app after submitting a clipboard session", async () => {
    const ctx = await createRuntime({
      captureText: async () => {
        return {
          kind: "targetOnly",
          reason: "NO_EDITABLE_ELEMENT",
          target: {
            appBundleId: "com.example.App",
            appIcon: null,
            appName: "Example",
            elementRole: null,
            processId: 123,
          },
        };
      },
    });
    try {
      const session = await ctx.runtime.capture();

      await ctx.runtime.submit(session.id, "updated");

      expect(ctx.deps.macAccessibility.activateApplication).toHaveBeenCalledWith(123);
      expect(ctx.deps.macAccessibility.replaceText).not.toHaveBeenCalled();
      expect(ctx.deps.macAccessibility.releaseText).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("keeps clipboard sessions submitted when focused app activation fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ctx = await createRuntime({
      activateApplication: async () => {
        throw new Error("app unavailable");
      },
      captureText: async () => {
        return {
          kind: "targetOnly",
          reason: "NO_EDITABLE_ELEMENT",
          target: {
            appBundleId: "com.example.App",
            appIcon: null,
            appName: "Example",
            elementRole: null,
            processId: 123,
          },
        };
      },
    });
    try {
      const session = await ctx.runtime.capture();

      const updatedBlock = await ctx.runtime.submit(session.id, "updated");

      expect(updatedBlock.content).toBe("updated");
      expect(ctx.deps.macAccessibility.activateApplication).toHaveBeenCalledWith(123);
      expect(warn).toHaveBeenCalledWith("External edit focused app activation failed", {
        message: "app unavailable",
        processId: 123,
      });
    } finally {
      await ctx.close();
    }
  });

  it("maps native permission errors to Accessibility permission business errors", async () => {
    const ctx = await createRuntime({
      captureText: async () => {
        throw new MacNativeError(
          "ACCESSIBILITY.PERMISSION_REQUIRED",
          "Accessibility permission is not granted.",
        );
      },
    });
    try {
      await expect(ctx.runtime.capture()).rejects.toMatchObject({
        code: "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
      });
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });

  it("builds a browser origin when the focused app is a known browser", async () => {
    const ctx = await createRuntime({
      resolveBrowserMetadata: async () => ({
        title: "Example Page",
        url: "https://example.com/page",
      }),
    });
    try {
      const session = await ctx.runtime.capture();

      expect(session.origin).toEqual({
        app: {
          bundleId: "com.example.App",
          icon: null,
          name: "Example",
          processId: 123,
        },
        elementRole: "AXTextArea",
        kind: "browser",
        page: {
          title: "Example Page",
          url: "https://example.com/page",
        },
      });
      expect(session.submission).toEqual({ transport: "direct" });

      await ctx.runtime.submit(session.id, "updated");

      expect(ctx.deps.macAccessibility.replaceText).toHaveBeenCalledWith("text-ref-1", "updated");
    } finally {
      await ctx.close();
    }
  });

  it("falls back to a focused app origin when browser metadata is unavailable", async () => {
    const ctx = await createRuntime({ resolveBrowserMetadata: async () => null });
    try {
      const session = await ctx.runtime.capture();

      expect(session.origin).toEqual(createMacAppOrigin());
    } finally {
      await ctx.close();
    }
  });

  it("falls back to a focused app origin when browser metadata resolution throws", async () => {
    const ctx = await createRuntime({
      resolveBrowserMetadata: async () => {
        throw new Error("osascript failed");
      },
    });
    try {
      const session = await ctx.runtime.capture();

      expect(session.origin).toEqual(createMacAppOrigin());
    } finally {
      await ctx.close();
    }
  });
});
