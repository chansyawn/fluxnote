import fs from "node:fs/promises";
import net from "node:net";

import {
  cliEntrypointEnvelopeSchema,
  resolveCliIpcSocketPath,
  type CliIpcResponseEnvelope,
} from "@shared/features/cli/cli-transport";
import { type BackendCommandKey } from "@shared/features/entrypoints/commands";
import { toIpcErrorPayload } from "@shared/ipc/result";

interface CliIpcServerServices {
  dispatchCommand: (
    command: BackendCommandKey,
    payload: unknown,
    signal?: AbortSignal,
  ) => Promise<
    { data: unknown; ok: true } | { error: ReturnType<typeof toIpcErrorPayload>; ok: false }
  >;
}

export interface CliIpcServer {
  close: () => Promise<void>;
  start: () => Promise<void>;
}

function encodeResponse(response: CliIpcResponseEnvelope): string {
  return `${JSON.stringify(response)}\n`;
}

async function removeStaleSocket(socketPath: string): Promise<void> {
  if (process.platform === "win32") {
    return;
  }

  await fs.rm(socketPath, { force: true });
}

export function createCliIpcServer(services: CliIpcServerServices): CliIpcServer {
  const socketPath = resolveCliIpcSocketPath();
  const server = net.createServer((socket) => {
    let buffer = "";
    let handled = false;
    const abortController = new AbortController();

    socket.once("close", () => abortController.abort());
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => {
      if (handled) {
        return;
      }

      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        return;
      }

      handled = true;
      const line = buffer.slice(0, newlineIndex);
      void handleRequestLine(line, abortController.signal).then((response) => {
        if (!socket.destroyed) {
          socket.end(encodeResponse(response));
        }
      });
    });
  });

  async function handleRequestLine(
    line: string,
    signal: AbortSignal,
  ): Promise<CliIpcResponseEnvelope> {
    let requestId = "unknown";

    try {
      const envelope = cliEntrypointEnvelopeSchema.parse(JSON.parse(line));
      requestId = envelope.id;
      const result = await services.dispatchCommand(envelope.command, envelope.payload, signal);

      if (!result.ok) {
        return {
          error: result.error,
          id: envelope.id,
          ok: false,
        };
      }

      return {
        data: result.data,
        id: envelope.id,
        ok: true,
      };
    } catch (error) {
      return {
        error: toIpcErrorPayload(error),
        id: requestId,
        ok: false,
      };
    }
  }

  async function start(): Promise<void> {
    await removeStaleSocket(socketPath);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => {
        server.off("error", reject);
        resolve();
      });
    });
  }

  async function close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    await removeStaleSocket(socketPath);
  }

  return { close, start };
}
