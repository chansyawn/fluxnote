import net from "node:net";

import {
  cliIpcResponseEnvelopeSchema,
  createCliEntrypointEnvelope,
  resolveCliIpcSocketPath,
} from "@shared/features/cli/cli-transport";
import {
  backendCommandContracts,
  type BackendCommandKey,
  type BackendCommandResponse,
} from "@shared/features/entrypoints/commands";

export const CONNECT_RETRY_INTERVAL_MS = 150;

function parseSocketErrorCode(error: unknown): string | undefined {
  return error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;
}

export function isConnectionError(error: unknown): boolean {
  const code = parseSocketErrorCode(error);
  return code === "ENOENT" || code === "ECONNREFUSED" || code === "EPIPE";
}

export async function waitForServer(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(resolveCliIpcSocketPath());
        socket.once("connect", () => {
          socket.end();
          resolve();
        });
        socket.once("error", reject);
      });
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, CONNECT_RETRY_INTERVAL_MS));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Timed out waiting for Fluxnotes.");
}

export async function sendCommand<TKey extends BackendCommandKey>(
  command: TKey,
  payload: unknown,
): Promise<BackendCommandResponse<TKey>> {
  const request = createCliEntrypointEnvelope(command, payload);
  const socketPath = resolveCliIpcSocketPath();

  return await new Promise<BackendCommandResponse<TKey>>((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = "";

    socket.setEncoding("utf8");
    socket.once("connect", () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        return;
      }

      const line = buffer.slice(0, newlineIndex);
      try {
        const response = cliIpcResponseEnvelopeSchema.parse(JSON.parse(line));
        if (response.id !== request.id) {
          throw new Error("Mismatched CLI IPC response id.");
        }
        if (!response.ok) {
          throw response.error;
        }

        const data = backendCommandContracts[command].response.parse(response.data);
        resolve(data as BackendCommandResponse<TKey>);
      } catch (error) {
        reject(error);
      } finally {
        socket.end();
      }
    });
    socket.once("error", reject);
    socket.once("end", () => {
      if (buffer.length === 0) {
        reject(new Error("CLI IPC server closed the connection without a response."));
      }
    });
  });
}
