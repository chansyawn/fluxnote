import { MacNativeError, type MacAccessibilityNative } from "@fluxnotes/mac-native";
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

const cliTrigger = {
  cwd: "/workspace",
  git: null,
  requestedFilePath: "block.md",
  source: "cli" as const,
  targetFilePath: "/workspace/block.md",
};

function createFocusedAppTrigger() {
  return {
    appBundleId: "com.example.App",
    appIcon: null,
    appName: "Example",
    elementRole: "AXTextArea",
    mode: "write_back" as const,
    processId: 123,
    source: "focused_app" as const,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function createRuntime(overrides?: {
  activate?: (processId: number) => Promise<void>;
  capture?: MacAccessibilityNative["capture"];
  isAccessibilityTrusted?: (prompt: boolean) => boolean;
  isSupported?: () => boolean;
  resolveBrowserMetadata?: typeof resolveBrowserMetadata;
  writeBack?: (sessionId: string, content: string) => Promise<void>;
}) {
  const ctx = await createTestDb();
  const macAccessibility: MacAccessibilityNative = {
    activate: vi.fn(overrides?.activate ?? (async () => undefined)),
    capture: vi.fn(
      overrides?.capture ??
        (async () => ({
          content: "selected",
          mode: "write_back" as const,
          sessionId: "native-session-1",
          target: {
            appBundleId: "com.example.App",
            appIcon: null,
            appName: "Example",
            elementRole: "AXTextArea",
            processId: 123,
          },
        })),
    ),
    closeSession: vi.fn(async () => undefined),
    isAccessibilityTrusted: vi.fn(overrides?.isAccessibilityTrusted ?? (() => true)),
    isSupported: vi.fn(overrides?.isSupported ?? (() => true)),
    writeBack: vi.fn(overrides?.writeBack ?? (async () => undefined)),
  };
  const deps = {
    clipboard: { writeText: vi.fn() },
    emitEvent: vi.fn(() => true),
    macAccessibility,
    openBlockService: { requestOpen: vi.fn() },
    resolveBrowserMetadata: vi.fn(overrides?.resolveBrowserMetadata ?? (async () => null)),
    telemetryService: { captureEvent: vi.fn() },
  };
  const runtime = createExternalEditRuntime({
    clipboard: deps.clipboard,
    emitEvent: deps.emitEvent,
    getDb: () => ctx.db,
    macAccessibility: deps.macAccessibility,
    openBlockService: deps.openBlockService as never,
    paths,
    resolveBrowserMetadata: deps.resolveBrowserMetadata,
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
      const resultPromise = ctx.runtime.createFileSession(block.id, cliTrigger);
      const session = ctx.runtime.listSessions()[0];

      expect(session).toMatchObject({ blockId: block.id, trigger: cliTrigger });

      const updatedBlock = await ctx.runtime.submit(session!.editId, "after");

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
      writeBack: async () => {
        throw new Error("lost element");
      },
    });
    try {
      const session = await ctx.runtime.capture();

      const updatedBlock = await ctx.runtime.submit(session.editId, "updated");

      expect(updatedBlock.content).toBe("updated");
      expect(ctx.deps.clipboard.writeText).toHaveBeenCalledWith("updated");
      expect(ctx.deps.emitEvent).toHaveBeenCalledWith("external-edit.write-back-failed", {
        blockId: session.blockId,
        editId: session.editId,
        reason: "lost element",
      });
      expect(ctx.deps.macAccessibility.closeSession).toHaveBeenCalledWith("native-session-1");
    } finally {
      await ctx.close();
    }
  });

  it("resolves submitted sessions with external file urls without changing stored content", async () => {
    const ctx = await createRuntime();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const resultPromise = ctx.runtime.createFileSession(block.id, cliTrigger);
      const session = ctx.runtime.listSessions()[0]!;
      const content = [
        "Literal assets://not-an-image/photo.png",
        "",
        `![Alt](assets://${block.id}/photo.png)`,
      ].join("\n");

      const updatedBlock = await ctx.runtime.submit(session.editId, content);

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
      const resultPromise = ctx.runtime.createFileSession(block.id, cliTrigger);
      const session = ctx.runtime.listSessions()[0]!;

      await ctx.runtime.cancel(session.editId);

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
      const oneResult = ctx.runtime.createFileSession(one.id, cliTrigger);
      const twoResult = ctx.runtime.createFileSession(two.id, cliTrigger);

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
      const resultPromise = ctx.runtime.createFileSession(block.id, cliTrigger, controller.signal);

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
      const resultPromise = ctx.runtime.createFileSession("missing", cliTrigger);
      const session = ctx.runtime.listSessions()[0]!;

      await expect(ctx.runtime.submit(session.editId, "after")).rejects.toMatchObject({
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
        trigger: createFocusedAppTrigger(),
      });
      expect(ctx.deps.openBlockService.requestOpen).toHaveBeenCalledWith({
        blockId: session.blockId,
      });
      expect(ctx.deps.telemetryService.captureEvent).toHaveBeenCalledWith("block_created", {
        source: "focused_app_external_edit",
      });
      const block = await getPublicBlockById(ctx.db, session.blockId);
      expect(block.content).toBe("selected");

      await ctx.runtime.submit(session.editId, "updated");

      expect(ctx.deps.macAccessibility.activate).not.toHaveBeenCalled();
      expect(ctx.deps.macAccessibility.writeBack).toHaveBeenCalledWith(
        "native-session-1",
        "updated",
      );
      expect(ctx.deps.macAccessibility.closeSession).toHaveBeenCalledWith("native-session-1");
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

  it("creates a copy-only session when no focused editable element is found", async () => {
    const ctx = await createRuntime({
      capture: async () => {
        return {
          content: "",
          mode: "copy_only",
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
        trigger: {
          appBundleId: "com.example.App",
          appIcon: null,
          appName: "Example",
          elementRole: null,
          mode: "copy_only",
          processId: 123,
          source: "focused_app",
        },
      });
      expect(ctx.deps.openBlockService.requestOpen).toHaveBeenCalledWith({
        blockId: session.blockId,
      });
      const block = await getPublicBlockById(ctx.db, session.blockId);
      expect(block.content).toBe("");
      expect(ctx.deps.macAccessibility.closeSession).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("activates focused app after submitting a copy-only session", async () => {
    const ctx = await createRuntime({
      capture: async () => {
        return {
          content: "",
          mode: "copy_only",
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

      await ctx.runtime.submit(session.editId, "updated");

      expect(ctx.deps.macAccessibility.activate).toHaveBeenCalledWith(123);
      expect(ctx.deps.macAccessibility.writeBack).not.toHaveBeenCalled();
      expect(ctx.deps.macAccessibility.closeSession).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("keeps copy-only sessions submitted when focused app activation fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ctx = await createRuntime({
      activate: async () => {
        throw new Error("app unavailable");
      },
      capture: async () => {
        return {
          content: "",
          mode: "copy_only",
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

      const updatedBlock = await ctx.runtime.submit(session.editId, "updated");

      expect(updatedBlock.content).toBe("updated");
      expect(ctx.deps.macAccessibility.activate).toHaveBeenCalledWith(123);
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
      capture: async () => {
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

  it("builds a browser trigger when the focused app is a known browser", async () => {
    const ctx = await createRuntime({
      resolveBrowserMetadata: async () => ({
        faviconDataUrl: "data:image/png;base64,FAVICON",
        title: "Example Page",
        url: "https://example.com/page",
      }),
    });
    try {
      const session = await ctx.runtime.capture();

      expect(session.trigger).toEqual({
        appBundleId: "com.example.App",
        appIcon: null,
        appName: "Example",
        faviconDataUrl: "data:image/png;base64,FAVICON",
        mode: "write_back",
        processId: 123,
        source: "browser",
        title: "Example Page",
        url: "https://example.com/page",
      });

      await ctx.runtime.submit(session.editId, "updated");

      expect(ctx.deps.macAccessibility.writeBack).toHaveBeenCalledWith(
        "native-session-1",
        "updated",
      );
    } finally {
      await ctx.close();
    }
  });

  it("falls back to a focused app trigger when browser metadata is unavailable", async () => {
    const ctx = await createRuntime({ resolveBrowserMetadata: async () => null });
    try {
      const session = await ctx.runtime.capture();

      expect(session.trigger).toEqual(createFocusedAppTrigger());
    } finally {
      await ctx.close();
    }
  });

  it("falls back to a focused app trigger when browser metadata resolution throws", async () => {
    const ctx = await createRuntime({
      resolveBrowserMetadata: async () => {
        throw new Error("osascript failed");
      },
    });
    try {
      const session = await ctx.runtime.capture();

      expect(session.trigger).toEqual(createFocusedAppTrigger());
    } finally {
      await ctx.close();
    }
  });
});
