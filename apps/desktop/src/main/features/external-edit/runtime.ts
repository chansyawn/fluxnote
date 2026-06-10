import {
  createMacAccessibilityNative,
  MacNativeError,
  type MacAccessibilityCaptureResult,
  type MacAccessibilityNative,
} from "@fluxnotes/mac-native";
import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import { blocks, getSqliteChangedRows, nowIsoString } from "@main/core/database";
import type { EventBus } from "@main/core/ipc";
import type { OpenBlockService } from "@main/features/open-block";
import type { TelemetryService } from "@main/features/telemetry";
import type {
  BrowserExternalEditTrigger,
  CliExternalEditTrigger,
  ExternalEditResult,
  ExternalEditSession,
  ExternalEditTrigger,
  FocusedAppExternalEditTrigger,
} from "@shared/features/external-edit/models";
import { businessError } from "@shared/ipc/result";
import { eq } from "drizzle-orm";
import { clipboard } from "electron";

import { externalizeMarkdownAssetUrls } from "../assets/service";
import { createBlockRecord, getPublicBlockById } from "../blocks/service";
import { resolveBrowserMetadata, type BrowserMetadata } from "./browser-metadata";

interface PendingExternalEdit {
  claimed: boolean;
  resolve: (result: ExternalEditResult) => void;
  session: ExternalEditSession;
  target?: ExternalEditTarget;
}

interface ClaimedExternalEdit {
  cancelTarget: () => void;
  resolve: (result: ExternalEditResult) => void;
  session: ExternalEditSession;
  submitTarget: (content: string) => Promise<void>;
}

interface BeginExternalEditResult {
  result: Promise<ExternalEditResult>;
  session: ExternalEditSession;
}

interface ExternalEditTarget {
  cancel?: (session: ExternalEditSession) => void;
  submit?: (session: ExternalEditSession, content: string) => Promise<void>;
}

interface BeginExternalEditOptions {
  signal?: AbortSignal;
  target?: ExternalEditTarget;
}

interface ExternalEditRuntimeDeps {
  clipboard: Pick<typeof clipboard, "writeText">;
  emitEvent: EventBus["emit"];
  getDb: () => AppDatabase;
  macAccessibility: MacAccessibilityNative;
  openBlockService: OpenBlockService;
  paths: AppDataPaths;
  resolveBrowserMetadata: typeof resolveBrowserMetadata;
  telemetryService: Pick<TelemetryService, "captureEvent">;
}

export interface ExternalEditRuntime {
  cancel: (editId: string) => Promise<void>;
  cancelAll: () => void;
  capture: () => Promise<ExternalEditSession>;
  createFileSession: (
    blockId: string,
    trigger: CliExternalEditTrigger,
    signal?: AbortSignal,
  ) => Promise<ExternalEditResult>;
  listSessions: () => ExternalEditSession[];
  submit: (
    editId: string,
    content: string,
  ) => Promise<Awaited<ReturnType<typeof getPublicBlockById>>>;
}

function createEditId(): string {
  return crypto.randomUUID();
}

function createCreatedAt(): string {
  return new Date().toISOString();
}

function toBusinessInvalidOperation(error: unknown): never {
  if (error instanceof MacNativeError && error.code === "ACCESSIBILITY.PERMISSION_REQUIRED") {
    throw businessError("BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED", error.message);
  }

  throw businessError(
    "BUSINESS.INVALID_OPERATION",
    error instanceof Error ? error.message : "Unable to start external edit from focused input.",
  );
}

function warnFocusedAppActivationFailure(processId: number, error: unknown): void {
  console.warn("External edit focused app activation failed", {
    message: error instanceof Error ? error.message : "Unknown activation failure.",
    processId,
  });
}

function createFocusedAppTrigger(
  captureResult: MacAccessibilityCaptureResult,
): FocusedAppExternalEditTrigger {
  return {
    appBundleId: captureResult.target.appBundleId,
    appIcon: captureResult.target.appIcon,
    appName: captureResult.target.appName,
    elementRole: captureResult.target.elementRole,
    mode: captureResult.mode,
    processId: captureResult.target.processId,
    source: "focused_app",
  };
}

function createBrowserTrigger(
  captureResult: MacAccessibilityCaptureResult,
  browser: BrowserMetadata,
): BrowserExternalEditTrigger {
  return {
    appBundleId: captureResult.target.appBundleId,
    appIcon: captureResult.target.appIcon,
    appName: captureResult.target.appName,
    mode: captureResult.mode,
    processId: captureResult.target.processId,
    source: "browser",
    title: browser.title,
    url: browser.url,
  };
}

export function createExternalEditRuntime(deps: ExternalEditRuntimeDeps): ExternalEditRuntime {
  const pendingEdits = new Map<string, PendingExternalEdit>();

  function listSessions(): ExternalEditSession[] {
    return Array.from(pendingEdits.values()).map((entry) => entry.session);
  }

  function emitSessionsChanged(): void {
    deps.emitEvent("external-edit.sessions-changed", listSessions());
  }

  function begin(
    blockId: string,
    trigger: ExternalEditTrigger,
    options?: BeginExternalEditOptions,
  ): BeginExternalEditResult {
    const session: ExternalEditSession = {
      blockId,
      createdAt: createCreatedAt(),
      editId: createEditId(),
      trigger,
    };
    const result = new Promise<ExternalEditResult>((resolve) => {
      pendingEdits.set(session.editId, {
        claimed: false,
        resolve,
        session,
        target: options?.target,
      });
    });

    emitSessionsChanged();

    options?.signal?.addEventListener(
      "abort",
      () => {
        const entry = pendingEdits.get(session.editId);
        if (!entry || entry.claimed) return;
        pendingEdits.delete(session.editId);
        emitSessionsChanged();
        entry.target?.cancel?.(entry.session);
        entry.resolve({ blockId, status: "cancelled" });
      },
      { once: true },
    );

    return { result, session };
  }

  function claim(editId: string): ClaimedExternalEdit {
    const entry = pendingEdits.get(editId);
    if (!entry) {
      throw businessError("BUSINESS.NOT_FOUND", `External edit not found: ${editId}`);
    }
    if (entry.claimed) {
      throw businessError(
        "BUSINESS.INVALID_OPERATION",
        `External edit already claimed: ${editId}`,
        { editId },
      );
    }

    entry.claimed = true;
    emitSessionsChanged();
    return {
      cancelTarget: () => entry.target?.cancel?.(entry.session),
      resolve: (result) => {
        pendingEdits.delete(editId);
        emitSessionsChanged();
        entry.resolve(result);
      },
      session: entry.session,
      submitTarget: async (content) => {
        await entry.target?.submit?.(entry.session, content);
      },
    };
  }

  async function createExternalEditBlock(content: string): Promise<string> {
    const block = await createBlockRecord(deps.getDb(), content);
    deps.telemetryService.captureEvent("block_created", {
      source: "focused_app_external_edit",
    });
    deps.openBlockService.requestOpen({ blockId: block.id });
    return block.id;
  }

  async function activateFocusedApp(processId: number): Promise<void> {
    if (processId <= 0) {
      return;
    }

    try {
      await deps.macAccessibility.activate(processId);
    } catch (error) {
      warnFocusedAppActivationFailure(processId, error);
    }
  }

  async function writeBackOrFallback(
    session: ExternalEditSession,
    nativeSessionId: string,
    content: string,
  ): Promise<void> {
    try {
      await deps.macAccessibility.writeBack(nativeSessionId, content);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown write-back failure.";
      deps.clipboard.writeText(content);
      deps.emitEvent("external-edit.write-back-failed", {
        blockId: session.blockId,
        editId: session.editId,
        reason,
      });
    } finally {
      await deps.macAccessibility.closeSession(nativeSessionId);
    }
  }

  async function buildFocusedTrigger(
    captureResult: MacAccessibilityCaptureResult,
  ): Promise<FocusedAppExternalEditTrigger | BrowserExternalEditTrigger> {
    const browser = await deps.resolveBrowserMetadata(captureResult.target).catch(() => null);
    return browser
      ? createBrowserTrigger(captureResult, browser)
      : createFocusedAppTrigger(captureResult);
  }

  async function capture(): Promise<ExternalEditSession> {
    if (!deps.macAccessibility.isSupported()) {
      throw businessError(
        "BUSINESS.UNSUPPORTED_PLATFORM",
        "External edit from focused inputs is only supported on macOS.",
      );
    }

    if (!deps.macAccessibility.isAccessibilityTrusted(true)) {
      throw businessError(
        "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
        "Fluxnotes needs macOS Accessibility permission to read focused inputs.",
      );
    }

    let captureResult: MacAccessibilityCaptureResult;
    try {
      captureResult = await deps.macAccessibility.capture();
    } catch (error) {
      toBusinessInvalidOperation(error);
    }

    const trigger = await buildFocusedTrigger(captureResult);
    const blockId = await createExternalEditBlock(captureResult.content);
    if (captureResult.mode === "copy_only") {
      return begin(blockId, trigger, {
        target: {
          submit: async () => {
            await activateFocusedApp(trigger.processId);
          },
        },
      }).session;
    }

    return begin(blockId, trigger, {
      target: {
        cancel: () => {
          void deps.macAccessibility.closeSession(captureResult.sessionId);
        },
        submit: async (session, content) => {
          await writeBackOrFallback(session, captureResult.sessionId, content);
        },
      },
    }).session;
  }

  async function createFileSession(
    blockId: string,
    trigger: CliExternalEditTrigger,
    signal?: AbortSignal,
  ): Promise<ExternalEditResult> {
    return await begin(blockId, trigger, { signal }).result;
  }

  async function submit(editId: string, content: string) {
    const claimed = claim(editId);
    try {
      const externalContent = await externalizeMarkdownAssetUrls(
        { paths: deps.paths },
        deps.getDb(),
        content,
      );
      const result = await deps
        .getDb()
        .update(blocks)
        .set({
          content,
          updatedAt: nowIsoString(),
        })
        .where(eq(blocks.id, claimed.session.blockId))
        .run();
      if (getSqliteChangedRows(result) === 0) {
        throw businessError("BUSINESS.NOT_FOUND", `Resource not found: ${claimed.session.blockId}`);
      }

      claimed.resolve({
        blockId: claimed.session.blockId,
        content: externalContent,
        status: "submitted",
      });
      await claimed.submitTarget(externalContent).catch((error: unknown) => {
        console.error("External edit write-back failed", error);
      });
      return await getPublicBlockById(deps.getDb(), claimed.session.blockId);
    } catch (error) {
      claimed.cancelTarget();
      claimed.resolve({
        blockId: claimed.session.blockId,
        status: "cancelled",
      });
      throw error;
    }
  }

  async function cancel(editId: string): Promise<void> {
    const claimed = claim(editId);
    claimed.cancelTarget();
    claimed.resolve({
      blockId: claimed.session.blockId,
      status: "cancelled",
    });
  }

  function cancelAll(): void {
    const entries = Array.from(pendingEdits.values());
    pendingEdits.clear();
    for (const entry of entries) {
      entry.target?.cancel?.(entry.session);
      entry.resolve({
        blockId: entry.session.blockId,
        status: "cancelled",
      });
    }
    emitSessionsChanged();
  }

  return { cancel, cancelAll, capture, createFileSession, listSessions, submit };
}

export function createDefaultExternalEditRuntime(
  deps: Omit<ExternalEditRuntimeDeps, "clipboard" | "macAccessibility" | "resolveBrowserMetadata">,
): ExternalEditRuntime {
  return createExternalEditRuntime({
    ...deps,
    clipboard,
    macAccessibility: createMacAccessibilityNative(),
    resolveBrowserMetadata,
  });
}
