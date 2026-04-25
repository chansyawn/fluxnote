import { spawn } from "node:child_process";
import { access, stat } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  backendCommandContracts,
  type BackendCommandKey,
  type BackendCommandResponse,
} from "@shared/backend-command-contracts";
import {
  cliIpcResponseEnvelopeSchema,
  createCliIpcRequest,
  resolveCliIpcSocketPath,
} from "@shared/cli-ipc";

const INITIAL_SERVER_WAIT_MS = 3_000;
const DEV_SERVER_WAIT_MS = 15_000;
const CONNECT_RETRY_INTERVAL_MS = 150;

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === "ENOENT" || code === "ECONNREFUSED" || code === "EPIPE";
}

async function sendCommand<TKey extends BackendCommandKey>(
  command: TKey,
  payload: unknown,
): Promise<BackendCommandResponse<TKey>> {
  const request = createCliIpcRequest(command, payload);
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

async function waitForServer(timeoutMs: number): Promise<void> {
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

  throw lastError instanceof Error ? lastError : new Error("Timed out waiting for FluxNote.");
}

type CliContext =
  | { mode: "production"; appBundlePath: string }
  | { mode: "development"; repoRoot: string };

async function detectCliContext(): Promise<CliContext> {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(cliDir, "../..");
  const electronBinary = path.join(rootDir, "MacOS", "fluxnote");

  try {
    const s = await stat(electronBinary);
    if (s.isFile()) {
      return { mode: "production", appBundlePath: path.dirname(rootDir) };
    }
  } catch {
    // Not inside an app bundle
  }

  try {
    await access(path.join(rootDir, "package.json"));
    await access(path.join(rootDir, "src/main/index.ts"));
    return { mode: "development", repoRoot: rootDir };
  } catch {
    // Not in a dev repo either
  }

  throw new Error("Cannot determine FluxNote location. Reinstall the application.");
}

function launchApp(context: CliContext): void {
  if (context.mode === "production") {
    spawn("open", ["-a", context.appBundlePath], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn("vp", ["run", "dev"], {
      cwd: context.repoRoot,
      detached: true,
      stdio: "ignore",
    }).unref();
  }
}

async function ensureAppRunning(): Promise<void> {
  const context = await detectCliContext();
  const waitMs = context.mode === "production" ? INITIAL_SERVER_WAIT_MS : DEV_SERVER_WAIT_MS;

  launchApp(context);
  await waitForServer(waitMs);
}

export async function dispatchCommand<TKey extends BackendCommandKey>(
  command: TKey,
  payload: unknown,
): Promise<BackendCommandResponse<TKey>> {
  try {
    return await sendCommand(command, payload);
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }
  }

  await ensureAppRunning();
  return await sendCommand(command, payload);
}
