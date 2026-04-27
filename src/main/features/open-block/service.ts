import type { EmitIpcEvent } from "@main/core/ipc/emit-ipc-event";

interface OpenBlockServiceOptions {
  emitEvent: EmitIpcEvent;
  showWindow: () => void;
}

export interface PendingOpenBlockRequest {
  blockId: string | null;
}

export function createOpenBlockService(services: OpenBlockServiceOptions) {
  let pendingBlockId: string | null = null;

  function readPending(): PendingOpenBlockRequest {
    return { blockId: pendingBlockId };
  }

  function acknowledgePending(blockId: string): void {
    if (pendingBlockId === blockId) {
      pendingBlockId = null;
    }
  }

  function emitPending(): boolean {
    if (!pendingBlockId) {
      return false;
    }

    return services.emitEvent("openBlockRequested", { blockId: pendingBlockId });
  }

  function requestOpen(blockId: string): boolean {
    pendingBlockId = blockId;
    services.showWindow();
    emitPending();
    return true;
  }

  return { acknowledgePending, emitPending, readPending, requestOpen };
}

export type OpenBlockService = ReturnType<typeof createOpenBlockService>;
