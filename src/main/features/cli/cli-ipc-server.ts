import fs from "node:fs/promises";
import net from "node:net";

import {
  backendCommandContracts,
  type BackendCommandKey,
} from "@shared/entrypoints/backend-command-contracts";
import { toIpcErrorPayload } from "@shared/ipc/errors";
import {
  cliIpcRequestEnvelopeSchema,
  resolveCliIpcSocketPath,
  type CliIpcResponseEnvelope,
} from "@shared/transport/cli-ipc";

interface CliIpcServerServices {
  dispatchCommand: (
    command: BackendCommandKey,
    payload: unknown,
    signal?: AbortSignal,
  ) => Promise<unknown>;
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
      const envelope = cliIpcRequestEnvelopeSchema.parse(JSON.parse(line));
      requestId = envelope.id;
      const contract = backendCommandContracts[envelope.command];
      const request = contract.request.parse(envelope.payload);
      const response = await services.dispatchCommand(envelope.command, request, signal);
      const data = contract.response.parse(response);

      return {
        data,
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
