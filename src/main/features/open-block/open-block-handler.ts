import type { EmitIpcEvent } from "../ipc/emit-ipc-event";

interface OpenBlockHandlerServices {
  emitEvent: EmitIpcEvent;
  showWindow: () => void;
}

export interface PendingOpenBlockRequest {
  blockId: string | null;
}

export function createOpenBlockHandler(services: OpenBlockHandlerServices) {
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

export type OpenBlockHandler = ReturnType<typeof createOpenBlockHandler>;
