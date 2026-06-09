import { describe, expect, it, vi } from "vite-plus/test";

import { getPublicBlockById } from "../blocks/service";
import { createTestDb } from "../test-db";
import { MacAccessibilityHelperError } from "./helper";
import {
  createMacAccessibilityExternalEditService,
  type MacAccessibilityExternalEditService,
} from "./service";

function createTrigger() {
  return {
    appBundleId: "com.example.App",
    appName: "Example",
    elementRole: "AXTextArea",
    processId: 123,
    source: "mac_accessibility" as const,
  };
}

async function createService(overrides?: {
  capture?: () => Promise<{ content: string; trigger: ReturnType<typeof createTrigger> }>;
  isMac?: () => boolean;
  isTrustedAccessibilityClient?: (prompt: boolean) => boolean;
  writeBack?: (content: string) => Promise<void>;
}): Promise<{
  close: () => Promise<void>;
  deps: {
    clipboard: { writeText: ReturnType<typeof vi.fn> };
    emitEvent: ReturnType<typeof vi.fn>;
    externalEditManager: {
      begin: ReturnType<typeof vi.fn>;
    };
    helper: {
      capture: ReturnType<typeof vi.fn>;
      dispose: ReturnType<typeof vi.fn>;
      writeBack: ReturnType<typeof vi.fn>;
    };
    openBlockService: { requestOpen: ReturnType<typeof vi.fn> };
    telemetryService: { captureEvent: ReturnType<typeof vi.fn> };
  };
  service: MacAccessibilityExternalEditService;
  db: Awaited<ReturnType<typeof createTestDb>>["db"];
}> {
  const ctx = await createTestDb();
  const helper = {
    capture: vi.fn(
      overrides?.capture ??
        (async () => ({
          content: "selected",
          trigger: createTrigger(),
        })),
    ),
    dispose: vi.fn(),
    writeBack: vi.fn(overrides?.writeBack ?? (async () => undefined)),
  };
  const deps = {
    clipboard: { writeText: vi.fn() },
    emitEvent: vi.fn(() => true),
    externalEditManager: {
      begin: vi.fn((blockId, _content, trigger, options) => ({
        result: Promise.resolve({ blockId, status: "cancelled" }),
        session: {
          blockId,
          createdAt: "2026-01-01T00:00:00.000Z",
          editId: "edit-1",
          trigger,
        },
        options,
      })),
    },
    helper,
    openBlockService: { requestOpen: vi.fn() },
    telemetryService: { captureEvent: vi.fn() },
  };
  const service = createMacAccessibilityExternalEditService({
    clipboard: deps.clipboard,
    emitEvent: deps.emitEvent,
    externalEditManager: deps.externalEditManager as never,
    getDb: () => ctx.db,
    helperFactory: {
      create: vi.fn(async () => helper),
    },
    isMac: overrides?.isMac ?? (() => true),
    isTrustedAccessibilityClient: overrides?.isTrustedAccessibilityClient ?? (() => true),
    openBlockService: deps.openBlockService as never,
    telemetryService: deps.telemetryService,
  });

  return {
    close: async () => {
      ctx.close();
      await ctx.cleanup();
    },
    deps,
    db: ctx.db,
    service,
  };
}

describe("macOS Accessibility external edit service", () => {
  it("captures focused text, creates a block, and starts an external edit session", async () => {
    const ctx = await createService();
    try {
      const session = await ctx.service.startFocusedExternalEdit();

      expect(session).toMatchObject({
        blockId: expect.any(String),
        editId: "edit-1",
        trigger: createTrigger(),
      });
      expect(ctx.deps.openBlockService.requestOpen).toHaveBeenCalledWith({
        blockId: session.blockId,
      });
      expect(ctx.deps.externalEditManager.begin).toHaveBeenCalledWith(
        session.blockId,
        "selected",
        createTrigger(),
        expect.objectContaining({
          target: expect.objectContaining({
            cancel: expect.any(Function),
            submit: expect.any(Function),
          }),
        }),
      );
      expect(ctx.deps.telemetryService.captureEvent).toHaveBeenCalledWith("block_created", {
        source: "mac_accessibility_external_edit",
      });
    } finally {
      await ctx.close();
    }
  });

  it("rejects unsupported platforms before creating a block", async () => {
    const ctx = await createService({ isMac: () => false });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.UNSUPPORTED_PLATFORM",
      });
      expect(ctx.deps.externalEditManager.begin).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("rejects missing Accessibility permission before creating a block", async () => {
    const ctx = await createService({ isTrustedAccessibilityClient: () => false });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
      });
      expect(ctx.deps.externalEditManager.begin).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("copies content and emits event when write-back fails", async () => {
    const ctx = await createService({
      writeBack: async () => {
        throw new Error("lost element");
      },
    });
    try {
      const session = await ctx.service.startFocusedExternalEdit();
      const beginOptions = ctx.deps.externalEditManager.begin.mock.results[0]?.value.options;

      await beginOptions.target.submit(session, "updated");

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

  it("disposes helper when capture fails", async () => {
    const ctx = await createService({
      capture: async () => {
        throw new Error("No focused editable element was found.");
      },
    });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.INVALID_OPERATION",
      });
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
    } finally {
      await ctx.close();
    }
  });

  it("maps helper permission errors to Accessibility permission business errors", async () => {
    const ctx = await createService({
      capture: async () => {
        throw new MacAccessibilityHelperError(
          "Accessibility permission is not granted.",
          "permission_required",
        );
      },
    });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
      });
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
      expect(ctx.deps.externalEditManager.begin).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("maps helper editable element errors to invalid operations", async () => {
    const ctx = await createService({
      capture: async () => {
        throw new MacAccessibilityHelperError(
          "No focused editable element was found.",
          "no_editable_element",
        );
      },
    });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.INVALID_OPERATION",
      });
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
      expect(ctx.deps.externalEditManager.begin).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("maps plain permission-like errors to invalid operations", async () => {
    const ctx = await createService({
      capture: async () => {
        throw new Error("Accessibility permission is not granted.");
      },
    });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.INVALID_OPERATION",
      });
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
      expect(ctx.deps.externalEditManager.begin).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("maps helper secure field errors to invalid operations", async () => {
    const ctx = await createService({
      capture: async () => {
        throw new MacAccessibilityHelperError(
          "Secure text fields are not supported.",
          "secure_text_field",
        );
      },
    });
    try {
      await expect(ctx.service.startFocusedExternalEdit()).rejects.toMatchObject({
        code: "BUSINESS.INVALID_OPERATION",
      });
      expect(ctx.deps.helper.dispose).toHaveBeenCalledTimes(1);
      expect(ctx.deps.externalEditManager.begin).not.toHaveBeenCalled();
    } finally {
      await ctx.close();
    }
  });

  it("creates stored block content from the captured input", async () => {
    const ctx = await createService();
    try {
      const session = await ctx.service.startFocusedExternalEdit();

      const block = await getPublicBlockById(ctx.db, session.blockId);
      expect(session.blockId).toEqual(expect.any(String));
      expect(block.content).toBe("selected");
    } finally {
      await ctx.close();
    }
  });
});
