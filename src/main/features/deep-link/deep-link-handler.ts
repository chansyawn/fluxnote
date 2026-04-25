import type { EmitIpcEvent } from "../ipc/emit-ipc-event";

const DEEP_LINK_PROTOCOL = "fluxnote";

interface DeepLinkHandlerServices {
  emitEvent: EmitIpcEvent;
  showWindow: () => void;
}

export interface PendingDeepLink {
  blockId: string | null;
}

export function extractDeepLinkFromArgv(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${DEEP_LINK_PROTOCOL}://`)) ?? null;
}

export function parseDeepLinkBlockId(urlText: string): string | null {
  try {
    const parsed = new URL(urlText);
    if (parsed.protocol !== `${DEEP_LINK_PROTOCOL}:`) {
      return null;
    }

    const blockPath = parsed.pathname.replace(/^\/+/, "");
    if (parsed.hostname !== "block" || !blockPath) {
      return null;
    }

    return blockPath;
  } catch {
    return null;
  }
}

export function createDeepLinkHandler(services: DeepLinkHandlerServices) {
  let pendingBlockId: string | null = null;

  function readPending(): PendingDeepLink {
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

    return services.emitEvent("deepLinkOpenBlock", { blockId: pendingBlockId });
  }

  function handle(urlText: string): boolean {
    const blockId = parseDeepLinkBlockId(urlText);
    if (!blockId) {
      return false;
    }

    pendingBlockId = blockId;
    services.showWindow();
    emitPending();
    return true;
  }

  return { acknowledgePending, emitPending, handle, readPending };
}

export type DeepLinkHandler = ReturnType<typeof createDeepLinkHandler>;
