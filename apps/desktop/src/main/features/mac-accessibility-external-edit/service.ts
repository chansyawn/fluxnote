import type { AppDatabase } from "@main/core/database";
import type { EventBus } from "@main/core/ipc";
import type { ExternalEditManager } from "@main/features/external-edit";
import type { OpenBlockService } from "@main/features/open-block";
import type { TelemetryService } from "@main/features/telemetry";
import type { ExternalEditSession } from "@shared/features/external-edit/session-contracts";
import { businessError } from "@shared/ipc/result";
import { clipboard, systemPreferences } from "electron";

import { createBlockRecord } from "../blocks/service";
import {
  MacAccessibilityHelperError,
  type MacAccessibilityHelper,
  type MacAccessibilityHelperFactory,
} from "./helper";

interface MacAccessibilityExternalEditServiceDeps {
  clipboard: Pick<typeof clipboard, "writeText">;
  emitEvent: EventBus["emit"];
  externalEditManager: ExternalEditManager;
  getDb: () => AppDatabase;
  helperFactory: MacAccessibilityHelperFactory;
  isMac: () => boolean;
  isTrustedAccessibilityClient: (prompt: boolean) => boolean;
  openBlockService: OpenBlockService;
  telemetryService: Pick<TelemetryService, "captureEvent">;
}

export interface MacAccessibilityExternalEditService {
  startFocusedExternalEdit: () => Promise<ExternalEditSession>;
}

function toBusinessInvalidOperation(error: unknown): never {
  if (error instanceof MacAccessibilityHelperError && error.code === "permission_required") {
    throw businessError("BUSINESS.ACCESSIBILITY_PERMISSION_REQUIRED", error.message);
  }

  throw businessError(
    "BUSINESS.INVALID_OPERATION",
    error instanceof Error ? error.message : "Unable to start external edit from focused input.",
  );
}

export function createMacAccessibilityExternalEditService(
  deps: MacAccessibilityExternalEditServiceDeps,
): MacAccessibilityExternalEditService {
  async function writeBackOrFallback(
    session: ExternalEditSession,
    helper: MacAccessibilityHelper,
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

  async function startFocusedExternalEdit(): Promise<ExternalEditSession> {
    if (!deps.isMac()) {
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
    let capture: Awaited<ReturnType<MacAccessibilityHelper["capture"]>>;
    try {
      capture = await helper.capture();
    } catch (error) {
      helper.dispose();
      toBusinessInvalidOperation(error);
    }

    const block = await createBlockRecord(deps.getDb(), capture.content);
    deps.telemetryService.captureEvent("block_created", {
      source: "mac_accessibility_external_edit",
    });
    deps.openBlockService.requestOpen({ blockId: block.id });

    const begun = deps.externalEditManager.begin(block.id, capture.content, capture.trigger, {
      target: {
        cancel: () => helper.dispose(),
        submit: async (session, content) => {
          await writeBackOrFallback(session, helper, content);
        },
      },
    });

    return begun.session;
  }

  return { startFocusedExternalEdit };
}

export function createDefaultMacAccessibilityExternalEditService(
  deps: Omit<
    MacAccessibilityExternalEditServiceDeps,
    "clipboard" | "isMac" | "isTrustedAccessibilityClient"
  >,
): MacAccessibilityExternalEditService {
  return createMacAccessibilityExternalEditService({
    ...deps,
    clipboard,
    isMac: () => process.platform === "darwin",
    isTrustedAccessibilityClient: (prompt) =>
      systemPreferences.isTrustedAccessibilityClient(prompt),
  });
}
