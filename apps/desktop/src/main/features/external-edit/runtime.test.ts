import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { createBlockRecord, getPublicBlockById } from "../blocks/service";
import { createTestDb } from "../test-db";
import { FocusedAppHelperError } from "./native/helper";
import { createExternalEditRuntime } from "./runtime";

const paths = {
  assetPathForBlock: (id: string) => `/tmp/${id}`,
  assetsRootPath: "/tmp",
  databasePath: "/tmp/test.sqlite3",
  userDataPath: "/tmp",
};

const cliTrigger = {
  cwd: "/workspace",
  requestedFilePath: "block.md",
  source: "cli" as const,
  targetFilePath: "/workspace/block.md",
};

function createFocusedAppTrigger() {
  return {
    appBundleId: "com.example.App",
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
  capture?: () => Promise<{ content: string; trigger: ReturnType<typeof createFocusedAppTrigger> }>;
  isFocusedAppCaptureSupported?: () => boolean;
  isTrustedAccessibilityClient?: (prompt: boolean) => boolean;
  writeBack?: (content: string) => Promise<void>;
}) {
  const ctx = await createTestDb();
  const helper = {
    capture: vi.fn(
      overrides?.capture ??
        (async () => ({
          content: "selected",
          trigger: createFocusedAppTrigger(),
        })),
    ),
    dispose: vi.fn(),
    writeBack: vi.fn(overrides?.writeBack ?? (async () => undefined)),
  };
  const deps = {
    clipboard: { writeText: vi.fn() },
    emitEvent: vi.fn(() => true),
    helper,
    helperFactory: {
      create: vi.fn(async () => helper),
    },
    isFocusedAppCaptureSupported: overrides?.isFocusedAppCaptureSupported ?? (() => true),
    isTrustedAccessibilityClient: overrides?.isTrustedAccessibilityClient ?? (() => true),
    openBlockService: { requestOpen: vi.fn() },
    telemetryService: { captureEvent: vi.fn() },
  };
  const runtime = createExternalEditRuntime({
    clipboard: deps.clipboard,
    emitEvent: deps.emitEvent,
    getDb: () => ctx.db,
    helperFactory: deps.helperFactory,
    isFocusedAppCaptureSupported: deps.isFocusedAppCaptureSupported,
    isTrustedAccessibilityClient: deps.isTrustedAccessibilityClient,
    openBlockService: deps.openBlockService as never,
    paths,
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
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
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

      expect(ctx.deps.helper.writeBack).toHaveBeenCalledWith("updated");
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
    } finally {
      await ctx.close();
    }
  });

  it("rejects unsupported focused app capture platforms before creating a block", async () => {
    const ctx = await createRuntime({ isFocusedAppCaptureSupported: () => false });
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
    const ctx = await createRuntime({ isTrustedAccessibilityClient: () => false });
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
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const ctx = await createRuntime({
      capture: async () => {
        throw new FocusedAppHelperError(
          "No focused editable element was found.",
          "no_editable_element",
          {
            appBundleId: "com.example.App",
            appName: "Example",
            processId: 123,
          },
        );
      },
    });
    try {
      const session = await ctx.runtime.capture();

      expect(session).toMatchObject({
        blockId: expect.any(String),
        trigger: {
          appBundleId: "com.example.App",
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
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith("External edit capture fell back to copy-only", {
        appBundleId: "com.example.App",
        appName: "Example",
        code: "no_editable_element",
        elementRole: null,
        message: "No focused editable element was found.",
        processId: 123,
      });
    } finally {
      await ctx.close();
    }
  });

  it("maps helper permission errors to Accessibility permission business errors", async () => {
    const ctx = await createRuntime({
      capture: async () => {
        throw new FocusedAppHelperError(
          "Accessibility permission is not granted.",
          "permission_required",
        );
      },
    });
    try {
      await expect(ctx.runtime.capture()).rejects.toMatchObject({
        code: "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
      });
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
      expect(ctx.runtime.listSessions()).toHaveLength(0);
    } finally {
      await ctx.close();
    }
  });
});
