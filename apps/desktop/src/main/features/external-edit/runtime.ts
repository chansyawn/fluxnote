import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import { blocks, getSqliteChangedRows, nowIsoString } from "@main/core/database";
import type { EventBus } from "@main/core/ipc";
import type { OpenBlockService } from "@main/features/open-block";
import type { TelemetryService } from "@main/features/telemetry";
import type {
  CliExternalEditTrigger,
  ExternalEditResult,
  ExternalEditSession,
  ExternalEditTrigger,
  FocusedAppExternalEditTrigger,
} from "@shared/features/external-edit/models";
import { businessError } from "@shared/ipc/result";
import { eq } from "drizzle-orm";
import { clipboard, systemPreferences } from "electron";

import { externalizeMarkdownAssetUrls } from "../assets/service";
import { createBlockRecord, getPublicBlockById } from "../blocks/service";
import {
  createFocusedAppHelperFactory,
  FocusedAppHelperError,
  type FocusedAppHelper,
  type FocusedAppHelperFactory,
} from "./native/helper";

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
  helperFactory: FocusedAppHelperFactory;
  isFocusedAppCaptureSupported: () => boolean;
  isTrustedAccessibilityClient: (prompt: boolean) => boolean;
  openBlockService: OpenBlockService;
  paths: AppDataPaths;
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

const COPY_ONLY_CAPTURE_ERROR_CODES = new Set(["no_editable_element", "unsupported_element"]);

function createEditId(): string {
  return crypto.randomUUID();
}

function createCreatedAt(): string {
  return new Date().toISOString();
}

function toBusinessInvalidOperation(error: unknown): never {
  if (error instanceof FocusedAppHelperError && error.code === "permission_required") {
    throw businessError("BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED", error.message);
  }

  throw businessError(
    "BUSINESS.INVALID_OPERATION",
    error instanceof Error ? error.message : "Unable to start external edit from focused input.",
  );
}

function shouldCreateCopyOnlyExternalEdit(error: unknown): error is FocusedAppHelperError {
  return (
    error instanceof FocusedAppHelperError &&
    typeof error.code === "string" &&
    COPY_ONLY_CAPTURE_ERROR_CODES.has(error.code)
  );
}

function createCopyOnlyTrigger(error: FocusedAppHelperError): FocusedAppExternalEditTrigger {
  return {
    appBundleId: error.data?.appBundleId ?? null,
    appName: error.data?.appName ?? null,
    elementRole: error.data?.elementRole ?? null,
    mode: "copy_only",
    processId: error.data?.processId ?? 0,
    source: "focused_app",
  };
}

function warnCopyOnlyCaptureFallback(error: FocusedAppHelperError): void {
  console.warn("External edit capture fell back to copy-only", {
    appBundleId: error.data?.appBundleId ?? null,
    appName: error.data?.appName ?? null,
    code: error.code,
    elementRole: error.data?.elementRole ?? null,
    message: error.message,
    processId: error.data?.processId ?? 0,
  });
}

function warnFocusedAppActivationFailure(processId: number, error: unknown): void {
  console.warn("External edit focused app activation failed", {
    message: error instanceof Error ? error.message : "Unknown activation failure.",
    processId,
  });
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

    let helper: FocusedAppHelper | undefined;
    try {
      helper = await deps.helperFactory.create();
      await helper.activate(processId);
    } catch (error) {
      warnFocusedAppActivationFailure(processId, error);
    } finally {
      helper?.dispose();
    }
  }

  async function writeBackOrFallback(
    session: ExternalEditSession,
    helper: FocusedAppHelper,
    content: string,
  ): Promise<void> {
    try {
      await helper.writeBack(content);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown write-back failure.";
      deps.clipboard.writeText(content);
      deps.emitEvent("external-edit.write-back-failed", {
        blockId: session.blockId,
        editId: session.editId,
        reason,
      });
    } finally {
      helper.dispose();
    }
  }

  async function capture(): Promise<ExternalEditSession> {
    if (!deps.isFocusedAppCaptureSupported()) {
      throw businessError(
        "BUSINESS.UNSUPPORTED_PLATFORM",
        "External edit from focused inputs is only supported on macOS.",
      );
    }

    if (!deps.isTrustedAccessibilityClient(true)) {
      throw businessError(
        "BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED",
        "Fluxnotes needs macOS Accessibility permission to read focused inputs.",
      );
    }

    const helper = await deps.helperFactory.create();
    let captureResult: Awaited<ReturnType<FocusedAppHelper["capture"]>>;
    try {
      captureResult = await helper.capture();
    } catch (error) {
      helper.dispose();
      if (shouldCreateCopyOnlyExternalEdit(error)) {
        warnCopyOnlyCaptureFallback(error);
        const trigger = createCopyOnlyTrigger(error);
        const blockId = await createExternalEditBlock("");
        return begin(blockId, trigger, {
          target: {
            submit: async () => {
              await activateFocusedApp(trigger.processId);
            },
          },
        }).session;
      }
      toBusinessInvalidOperation(error);
    }

    const blockId = await createExternalEditBlock(captureResult.content);
    return begin(blockId, captureResult.trigger, {
      target: {
        cancel: () => helper.dispose(),
        submit: async (session, content) => {
          await writeBackOrFallback(session, helper, content);
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
  deps: Omit<
    ExternalEditRuntimeDeps,
    "clipboard" | "helperFactory" | "isFocusedAppCaptureSupported" | "isTrustedAccessibilityClient"
  >,
): ExternalEditRuntime {
  return createExternalEditRuntime({
    ...deps,
    clipboard,
    helperFactory: createFocusedAppHelperFactory(),
    isFocusedAppCaptureSupported: () => process.platform === "darwin",
    isTrustedAccessibilityClient: (prompt) =>
      systemPreferences.isTrustedAccessibilityClient(prompt),
  });
}
