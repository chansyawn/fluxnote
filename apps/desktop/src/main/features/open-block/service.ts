import type { EventBus } from "@main/core/ipc";

interface OpenBlockServiceOptions {
  emitEvent: EventBus["emit"];
  showWindow: () => void;
}

export interface OpenBlockTarget {
  blockId: string;
}

export interface PendingOpenBlockRequest {
  target: OpenBlockTarget | null;
}

export function createOpenBlockService(services: OpenBlockServiceOptions) {
  let pendingTarget: OpenBlockTarget | null = null;

  function readPending(): PendingOpenBlockRequest {
    return { target: pendingTarget };
  }

  function acknowledgePending(blockId: string): void {
    if (pendingTarget?.blockId === blockId) {
      pendingTarget = null;
    }
  }

  function emitPending(): boolean {
    if (!pendingTarget) {
      return false;
    }

    return services.emitEvent("open-block.requested", pendingTarget);
  }

  function requestOpen(target: OpenBlockTarget): boolean {
    pendingTarget = target;
    services.showWindow();
    emitPending();
    return true;
  }

  return { acknowledgePending, emitPending, readPending, requestOpen };
}

export type OpenBlockService = ReturnType<typeof createOpenBlockService>;
