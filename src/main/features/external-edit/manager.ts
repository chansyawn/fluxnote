import type { EmitIpcEvent } from "@main/core/ipc/emit-ipc-event";
import type {
  ExternalEditResult,
  ExternalEditSession,
} from "@shared/domains/external-edit/session-contracts";
import { businessError } from "@shared/ipc/errors";

interface PendingExternalEdit {
  originalContent: string;
  resolve: (result: ExternalEditResult) => void;
  session: ExternalEditSession;
}

export interface ClaimedExternalEdit {
  originalContent: string;
  resolve: (result: ExternalEditResult) => void;
  session: ExternalEditSession;
}

interface BeginExternalEditResult {
  result: Promise<ExternalEditResult>;
  session: ExternalEditSession;
}

interface ExternalEditManagerServices {
  emitEvent: EmitIpcEvent;
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
    services.emitEvent("externalEditSessionsChanged", listSessions());
  }

  function begin(
    blockId: string,
    originalContent: string,
    options?: { signal?: AbortSignal },
  ): BeginExternalEditResult {
    const session: ExternalEditSession = {
      blockId,
      createdAt: nowIsoString(),
      editId: crypto.randomUUID(),
    };
    const result = new Promise<ExternalEditResult>((resolve) => {
      pendingEdits.set(session.editId, {
        originalContent,
        resolve,
        session,
      });
    });

    emitSessionsChanged();

    options?.signal?.addEventListener(
      "abort",
      () => {
        const entry = pendingEdits.get(session.editId);
        if (!entry) return;
        pendingEdits.delete(session.editId);
        emitSessionsChanged();
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

    pendingEdits.delete(editId);
    emitSessionsChanged();
    return entry;
  }

  function cancelAll(): void {
    const entries = Array.from(pendingEdits.values());
    pendingEdits.clear();
    for (const entry of entries) {
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
