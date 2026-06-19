import {
  createMacAccessibilityNative,
  MacNativeError,
  type MacAccessibilityNative,
  type MacAccessibilityTextCapture,
  type MacAccessibilityTargetMetadata,
} from "@fluxnotes/mac-native";
import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import { blocks, getSqliteChangedRows, nowIsoString } from "@main/core/database";
import type { EventBus } from "@main/core/ipc";
import type { OpenBlockService } from "@main/features/open-block";
import type { TelemetryService } from "@main/features/telemetry";
import { APP_MACOS_BUNDLE_ID } from "@shared/app/app-config";
import type {
  BrowserExternalEditOrigin,
  CliExternalEditOrigin,
  ExternalEditResult,
  ExternalEditOrigin,
  ExternalEditSession,
  ExternalEditSubmission,
  MacAppExternalEditOrigin,
} from "@shared/features/external-edit/models";
import { businessError } from "@shared/ipc/result";
import { eq } from "drizzle-orm";
import { app, clipboard } from "electron";

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
  getSelfTargetProcessIds?: () => Iterable<number>;
  macAccessibility: MacAccessibilityNative;
  openBlockService: OpenBlockService;
  paths: AppDataPaths;
  resolveBrowserMetadata: typeof resolveBrowserMetadata;
  selfTargetBundleIds?: ReadonlySet<string>;
  telemetryService: Pick<TelemetryService, "captureEvent">;
}

export interface ExternalEditRuntime {
  cancel: (id: string) => Promise<void>;
  cancelAll: () => void;
  capture: () => Promise<ExternalEditSession>;
  createFileSession: (
    blockId: string,
    origin: CliExternalEditOrigin,
    signal?: AbortSignal,
  ) => Promise<ExternalEditResult>;
  listSessions: () => ExternalEditSession[];
  submit: (id: string, content: string) => Promise<Awaited<ReturnType<typeof getPublicBlockById>>>;
}

function createSessionId(): string {
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

function normalizeBundleId(bundleId: string | null | undefined): string | null {
  const normalized = bundleId?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeBundleIds(bundleIds: Iterable<string>): ReadonlySet<string> {
  return new Set(
    Array.from(bundleIds)
      .map((bundleId) => normalizeBundleId(bundleId))
      .filter((bundleId): bundleId is string => Boolean(bundleId)),
  );
}

function getDefaultSelfTargetProcessIds(): number[] {
  return app.getAppMetrics().map((metric) => metric.pid);
}

function getSelfTargetProcessIdSet(
  getSelfTargetProcessIds: () => Iterable<number>,
): ReadonlySet<number> {
  return new Set(
    Array.from(getSelfTargetProcessIds()).filter(
      (processId) => Number.isInteger(processId) && processId > 0,
    ),
  );
}

function isSelfTarget(
  target: MacAccessibilityTargetMetadata,
  options: {
    getSelfTargetProcessIds: () => Iterable<number>;
    selfTargetBundleIds: ReadonlySet<string>;
  },
): boolean {
  const targetBundleId = normalizeBundleId(target.appBundleId);
  if (targetBundleId && options.selfTargetBundleIds.has(targetBundleId)) {
    return true;
  }

  return getSelfTargetProcessIdSet(options.getSelfTargetProcessIds).has(target.processId);
}

function toSelfTargetBusinessError(target: MacAccessibilityTargetMetadata): never {
  throw businessError(
    "BUSINESS.EXTERNAL_EDIT_SELF_TARGET",
    "External edit cannot target Fluxnotes itself.",
    {
      appBundleId: target.appBundleId,
      appName: target.appName,
      processId: target.processId,
    },
  );
}

function warnFocusedAppActivationFailure(processId: number, error: unknown): void {
  console.warn("External edit focused app activation failed", {
    message: error instanceof Error ? error.message : "Unknown activation failure.",
    processId,
  });
}

function toAppMetadata(target: MacAccessibilityTargetMetadata) {
  return {
    bundleId: target.appBundleId,
    icon: target.appIcon,
    name: target.appName,
    processId: target.processId,
  };
}

function createMacAppOrigin(captureResult: MacAccessibilityTextCapture): MacAppExternalEditOrigin {
  return {
    app: toAppMetadata(captureResult.target),
    elementRole: captureResult.target.elementRole,
    kind: "macApp",
  };
}

function createBrowserOrigin(
  captureResult: MacAccessibilityTextCapture,
  browser: BrowserMetadata,
): BrowserExternalEditOrigin {
  return {
    app: toAppMetadata(captureResult.target),
    elementRole: captureResult.target.elementRole,
    kind: "browser",
    page: {
      title: browser.title,
      url: browser.url,
    },
  };
}

export function createExternalEditRuntime(deps: ExternalEditRuntimeDeps): ExternalEditRuntime {
  const pendingEdits = new Map<string, PendingExternalEdit>();
  const getSelfTargetProcessIds = deps.getSelfTargetProcessIds ?? getDefaultSelfTargetProcessIds;
  const selfTargetBundleIds = normalizeBundleIds(deps.selfTargetBundleIds ?? [APP_MACOS_BUNDLE_ID]);

  function listSessions(): ExternalEditSession[] {
    return Array.from(pendingEdits.values()).map((entry) => entry.session);
  }

  function emitSessionsChanged(): void {
    deps.emitEvent("external-edit.sessions-changed", listSessions());
  }

  function begin(
    blockId: string,
    origin: ExternalEditOrigin,
    submission: ExternalEditSubmission,
    options?: BeginExternalEditOptions,
  ): BeginExternalEditResult {
    const session: ExternalEditSession = {
      blockId,
      createdAt: createCreatedAt(),
      id: createSessionId(),
      origin,
      submission,
    };
    const result = new Promise<ExternalEditResult>((resolve) => {
      pendingEdits.set(session.id, {
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
        const entry = pendingEdits.get(session.id);
        if (!entry || entry.claimed) return;
        pendingEdits.delete(session.id);
        emitSessionsChanged();
        entry.target?.cancel?.(entry.session);
        entry.resolve({ blockId, status: "cancelled" });
      },
      { once: true },
    );

    return { result, session };
  }

  function claim(id: string): ClaimedExternalEdit {
    const entry = pendingEdits.get(id);
    if (!entry) {
      throw businessError("BUSINESS.NOT_FOUND", `External edit not found: ${id}`);
    }
    if (entry.claimed) {
      throw businessError("BUSINESS.INVALID_OPERATION", `External edit already claimed: ${id}`, {
        id,
      });
    }

    entry.claimed = true;
    emitSessionsChanged();
    return {
      cancelTarget: () => entry.target?.cancel?.(entry.session),
      resolve: (result) => {
        pendingEdits.delete(id);
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
      await deps.macAccessibility.activateApplication(processId);
    } catch (error) {
      warnFocusedAppActivationFailure(processId, error);
    }
  }

  async function replaceTextOrFallback(
    session: ExternalEditSession,
    textRef: string,
    content: string,
  ): Promise<void> {
    try {
      await deps.macAccessibility.replaceText(textRef, content);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown write-back failure.";
      deps.clipboard.writeText(content);
      deps.emitEvent("external-edit.write-back-failed", {
        blockId: session.blockId,
        id: session.id,
        reason,
      });
    } finally {
      await deps.macAccessibility.releaseText(textRef);
    }
  }

  async function buildFocusedOrigin(
    captureResult: MacAccessibilityTextCapture,
  ): Promise<MacAppExternalEditOrigin | BrowserExternalEditOrigin> {
    const browser = await deps.resolveBrowserMetadata(captureResult.target).catch(() => null);
    return browser
      ? createBrowserOrigin(captureResult, browser)
      : createMacAppOrigin(captureResult);
  }

  async function rejectSelfTargetCapture(
    captureResult: MacAccessibilityTextCapture,
  ): Promise<never> {
    if (captureResult.kind === "editableText") {
      await deps.macAccessibility.releaseText(captureResult.textRef).catch((error: unknown) => {
        console.warn("Failed to close self-target external edit native session", {
          message: error instanceof Error ? error.message : "Unknown close-session failure.",
          textRef: captureResult.textRef,
        });
      });
    }

    toSelfTargetBusinessError(captureResult.target);
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

    let captureResult: MacAccessibilityTextCapture;
    try {
      captureResult = await deps.macAccessibility.captureText();
    } catch (error) {
      toBusinessInvalidOperation(error);
    }

    if (
      isSelfTarget(captureResult.target, {
        getSelfTargetProcessIds,
        selfTargetBundleIds,
      })
    ) {
      await rejectSelfTargetCapture(captureResult);
    }

    const origin = await buildFocusedOrigin(captureResult);
    const blockId = await createExternalEditBlock(
      captureResult.kind === "editableText" ? captureResult.text : "",
    );
    if (captureResult.kind === "targetOnly") {
      return begin(
        blockId,
        origin,
        { transport: "clipboard" },
        {
          target: {
            submit: async () => {
              await activateFocusedApp(origin.app.processId);
            },
          },
        },
      ).session;
    }

    return begin(
      blockId,
      origin,
      { transport: "direct" },
      {
        target: {
          cancel: () => {
            void deps.macAccessibility.releaseText(captureResult.textRef);
          },
          submit: async (session, content) => {
            await replaceTextOrFallback(session, captureResult.textRef, content);
          },
        },
      },
    ).session;
  }

  async function createFileSession(
    blockId: string,
    origin: CliExternalEditOrigin,
    signal?: AbortSignal,
  ): Promise<ExternalEditResult> {
    return await begin(blockId, origin, { transport: "direct" }, { signal }).result;
  }

  async function submit(id: string, content: string) {
    const claimed = claim(id);
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

  async function cancel(id: string): Promise<void> {
    const claimed = claim(id);
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
