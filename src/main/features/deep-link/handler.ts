import { APP_PROTOCOL } from "@shared/app/app-config";
import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";
import {
  createEntrypointEnvelope,
  type EntrypointEnvelope,
} from "@shared/features/entrypoints/envelope";
import type { IpcResult } from "@shared/ipc/result";

type DeepLinkEnvelope = EntrypointEnvelope<BackendCommandKey>;

interface DeepLinkHandlerServices {
  dispatchEnvelope: <TKey extends BackendCommandKey>(
    envelope: EntrypointEnvelope<TKey>,
  ) => Promise<IpcResult<BackendCommandResponse<TKey>>>;
}

export function extractDeepLinkFromArgv(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith(`${APP_PROTOCOL}://`)) ?? null;
}

export function parseDeepLinkEnvelope(urlText: string): DeepLinkEnvelope | null {
  try {
    const parsed = new URL(urlText);
    if (parsed.protocol !== `${APP_PROTOCOL}:`) {
      return null;
    }

    const cleanPath = parsed.pathname.replace(/^\/+/, "");
    if (parsed.hostname === "app" && cleanPath === "open") {
      return createEntrypointEnvelope({
        command: "app.open",
        payload: null,
        source: "deep-link",
      });
    }

    if (parsed.hostname === "block" && cleanPath) {
      return createEntrypointEnvelope({
        command: "block.open",
        payload: { blockId: cleanPath },
        source: "deep-link",
      });
    }

    return null;
  } catch {
    return null;
  }
}

export function createDeepLinkHandler(services: DeepLinkHandlerServices) {
  async function handle(urlText: string): Promise<boolean> {
    const envelope = parseDeepLinkEnvelope(urlText);
    if (!envelope) {
      return false;
    }

    await services.dispatchEnvelope(envelope);
    return true;
  }

  return { handle };
}

export type DeepLinkHandler = ReturnType<typeof createDeepLinkHandler>;
