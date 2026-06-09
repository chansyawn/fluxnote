import type { EventBus } from "@main/core/ipc";
import type {
  ExternalEditResult,
  ExternalEditSession,
  ExternalEditTrigger,
} from "@shared/features/external-edit/session-contracts";
import { businessError } from "@shared/ipc/result";

interface PendingExternalEdit {
  claimed: boolean;
  originalContent: string;
  resolve: (result: ExternalEditResult) => void;
  session: ExternalEditSession;
  target?: ExternalEditTarget;
}

export interface ClaimedExternalEdit {
  cancelTarget: () => void;
  originalContent: string;
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
        originalContent,
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
      cancelTarget: () => entry.target?.cancel?.(entry.session),
      originalContent: entry.originalContent,
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

  return { begin, cancelAll, claim, listSessions };
}

export type ExternalEditManager = ReturnType<typeof createExternalEditManager>;
