import type { BackendCommandKey } from "@shared/backend-command-contracts";

const DEEP_LINK_PROTOCOL = "fluxnote";

type DeepLinkCommand =
  | {
      command: "app.open";
      payload: null;
    }
  | {
      command: "block.open";
      payload: { blockId: string };
    };

interface DeepLinkHandlerServices {
  dispatchCommand: (command: BackendCommandKey, payload: unknown) => Promise<unknown>;
}

export function extractDeepLinkFromArgv(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${DEEP_LINK_PROTOCOL}://`)) ?? null;
}

export function parseDeepLinkCommand(urlText: string): DeepLinkCommand | null {
  try {
    const parsed = new URL(urlText);
    if (parsed.protocol !== `${DEEP_LINK_PROTOCOL}:`) {
      return null;
    }

    const cleanPath = parsed.pathname.replace(/^\/+/, "");
    if (parsed.hostname === "app" && cleanPath === "open") {
      return { command: "app.open", payload: null };
    }

    if (parsed.hostname === "block" && cleanPath) {
      return {
        command: "block.open",
        payload: { blockId: cleanPath },
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function createDeepLinkHandler(services: DeepLinkHandlerServices) {
  async function handle(urlText: string): Promise<boolean> {
    const parsedCommand = parseDeepLinkCommand(urlText);
    if (!parsedCommand) {
      return false;
    }

    await services.dispatchCommand(parsedCommand.command, parsedCommand.payload);
    return true;
  }

  return { handle };
}

export type DeepLinkHandler = ReturnType<typeof createDeepLinkHandler>;
