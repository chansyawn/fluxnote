import type { EventBus } from "@main/core/ipc";
import type {
  ExternalEditResult,
  ExternalEditSession,
  ExternalEditTrigger,
} from "@shared/features/external-edit/session-contracts";
import { businessError } from "@shared/ipc/result";

interface PendingExternalEdit {
  claimed: boolean;
  onCancel?: () => void;
  originalContent: string;
  resolve: (result: ExternalEditResult) => void;
  writeBack?: (content: string) => Promise<void>;
  session: ExternalEditSession;
}

export interface ClaimedExternalEdit {
  cancel?: () => void;
  originalContent: string;
  resolve: (result: ExternalEditResult) => void;
  session: ExternalEditSession;
  writeBack?: (content: string) => Promise<void>;
}

interface BeginExternalEditResult {
  result: Promise<ExternalEditResult>;
  session: ExternalEditSession;
}

interface BeginExternalEditOptions {
  onCancel?: () => void;
  signal?: AbortSignal;
  writeBack?: (content: string) => Promise<void>;
}

interface ExternalEditManagerServices {
  emitEvent: EventBus["emit"];
}

function nowIsoString(): string {
  return new Date().toISOString();
}

export function createExternalEditManager(services: ExternalEditManagerServices) {
  const pendingEdits = new Map<string, PendingExternalEdit>();

  function listSessions(): ExternalEditSession[] {
    return Array.from(pendingEdits.values()).map((entry) => entry.session);
  }

  function emitSessionsChanged(): void {
    services.emitEvent("external-edit.sessions-changed", listSessions());
  }

  function begin(
    blockId: string,
    originalContent: string,
    trigger: ExternalEditTrigger,
    options?: BeginExternalEditOptions,
  ): BeginExternalEditResult {
    const session: ExternalEditSession = {
      blockId,
      createdAt: nowIsoString(),
      editId: crypto.randomUUID(),
      trigger,
    };
    const result = new Promise<ExternalEditResult>((resolve) => {
      pendingEdits.set(session.editId, {
        claimed: false,
        onCancel: options?.onCancel,
        originalContent,
        resolve,
        writeBack: options?.writeBack,
        session,
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
        entry.onCancel?.();
        entry.resolve({ blockId, status: "cancelled" });
      },
      { once: true },
    );

    return { result, session };
  }

  /** Atomically removes the session from the pending map and returns a resolve handle, preventing concurrent operations on the same session. */
  function claim(editId: string): ClaimedExternalEdit {
    const entry = pendingEdits.get(editId);
    if (!entry) {
      throw businessError("BUSINESS.NOT_FOUND", `External edit not found: ${editId}`);
    }
    if (entry.claimed) {
      throw businessError(
        "BUSINESS.INVALID_OPERATION",
        `External edit already claimed: ${editId}`,
        {
          editId,
        },
      );
    }

    entry.claimed = true;
    emitSessionsChanged();
    return {
      cancel: entry.onCancel,
      originalContent: entry.originalContent,
      resolve: (result) => {
        pendingEdits.delete(editId);
        emitSessionsChanged();
        entry.resolve(result);
      },
      session: entry.session,
      writeBack: entry.writeBack,
    };
  }

  function cancelAll(): void {
    const entries = Array.from(pendingEdits.values());
    pendingEdits.clear();
    for (const entry of entries) {
      entry.onCancel?.();
      entry.resolve({
        blockId: entry.session.blockId,
        status: "cancelled",
      });
    }
    emitSessionsChanged();
  }

  return { begin, cancelAll, claim, listSessions };
}

export type ExternalEditManager = ReturnType<typeof createExternalEditManager>;
