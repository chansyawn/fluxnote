import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

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
import { cac } from "cac";

const APP_OPEN_DEEP_LINK = "fluxnote://app/open";
const INITIAL_SERVER_WAIT_MS = 3_000;
const DEV_SERVER_WAIT_MS = 15_000;
const CONNECT_RETRY_INTERVAL_MS = 150;

type FluxCliCommand =
  | {
      kind: "create";
      source:
        | {
            text: string;
            type: "text";
          }
        | {
            filePath: string;
            type: "file";
          };
    }
  | {
      kind: "help";
    }
  | {
      kind: "open";
    };

interface FluxCliOptions {
  file?: unknown;
  help?: unknown;
  text?: unknown;
}

export class FluxCliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FluxCliUsageError";
  }
}

function createCli() {
  return cac("flux")
    .usage("[--text <text> | --file <path> | <path>]")
    .option("--text <text>", "Create a block with inline text")
    .option("--file <path>", "Create a block from a UTF-8 text file")
    .help();
}

function getStringOption(value: unknown, flag: string): string | null {
  if (value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new FluxCliUsageError(`${flag} requires a value.`);
  }

  return value;
}

function findUnknownOptions(options: Record<string, unknown>): string[] {
  const allowedOptions = new Set(["--", "file", "help", "text"]);
  return Object.keys(options).filter((key) => !allowedOptions.has(key));
}

export function parseFluxArgs(argv: readonly string[]): FluxCliCommand {
  const cli = createCli();
  const normalizedArgv = [...argv];
  if (normalizedArgv[2] === "--") {
    normalizedArgv.splice(2, 1);
  }
  const parsed = cli.parse(normalizedArgv, { run: false });
  const options = parsed.options as FluxCliOptions & Record<string, unknown>;

  if (options.help) {
    return { kind: "help" };
  }

  const unknownOptions = findUnknownOptions(options);
  if (unknownOptions.length > 0) {
    throw new FluxCliUsageError(`Unknown option: --${unknownOptions[0]}`);
  }

  const text = getStringOption(options.text, "--text");
  const file = getStringOption(options.file, "--file");
  const positionalFiles = parsed.args;
  const selectedInputCount =
    (text === null ? 0 : 1) + (file === null ? 0 : 1) + positionalFiles.length;

  if (selectedInputCount === 0) {
    return { kind: "open" };
  }

  if (selectedInputCount > 1) {
    throw new FluxCliUsageError("Use only one input source: --text, --file, or a file path.");
  }

  if (text !== null) {
    return {
      kind: "create",
      source: {
        text,
        type: "text",
      },
    };
  }

  return {
    kind: "create",
    source: {
      filePath: file ?? positionalFiles[0],
      type: "file",
    },
  };
}

async function readTextFile(filePath: string): Promise<string> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  await access(resolvedPath);
  return await readFile(resolvedPath, "utf8");
}

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as NodeJS.ErrnoException).code;
  return code === "ENOENT" || code === "ECONNREFUSED" || code === "EPIPE";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const payload = error as Record<string, unknown>;
    if (typeof payload.message === "string") {
      return payload.message;
    }
  }

  return "Unknown CLI error.";
}

async function sendCliCommand<TKey extends BackendCommandKey>(
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

async function waitForCliIpcServer(timeoutMs: number): Promise<void> {
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

function openDeepLink(url: string): void {
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function getRepositoryRootFromBuiltCli(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

async function canStartDevApp(): Promise<boolean> {
  const repositoryRoot = getRepositoryRootFromBuiltCli();
  try {
    await access(path.join(repositoryRoot, "package.json"));
    await access(path.join(repositoryRoot, "src/main/index.ts"));
    return true;
  } catch {
    return false;
  }
}

function startDevApp(): void {
  spawn("vp", ["run", "dev"], {
    cwd: getRepositoryRootFromBuiltCli(),
    detached: true,
    stdio: "ignore",
  }).unref();
}

async function ensureAppRunning(): Promise<void> {
  openDeepLink(APP_OPEN_DEEP_LINK);
  try {
    await waitForCliIpcServer(INITIAL_SERVER_WAIT_MS);
    return;
  } catch (error) {
    if (!isConnectionError(error) || !(await canStartDevApp())) {
      throw error;
    }
  }

  startDevApp();
  await waitForCliIpcServer(DEV_SERVER_WAIT_MS);
}

async function dispatchCliCommand<TKey extends BackendCommandKey>(
  command: TKey,
  payload: unknown,
): Promise<BackendCommandResponse<TKey>> {
  try {
    return await sendCliCommand(command, payload);
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }
  }

  await ensureAppRunning();
  return await sendCliCommand(command, payload);
}

export async function runFluxCli(argv: readonly string[] = process.argv): Promise<number> {
  const command = parseFluxArgs(argv);

  if (command.kind === "help") {
    return 0;
  }

  if (command.kind === "open") {
    await dispatchCliCommand("app.open", null);
    console.log("Opened FluxNote.");
    return 0;
  }

  const content =
    command.source.type === "text"
      ? command.source.text
      : await readTextFile(command.source.filePath);
  const result = await dispatchCliCommand("block.createFromText", { content });
  console.log(`Created block: ${result.blockId}`);
  return 0;
}

function isDirectInvocation(): boolean {
  const entryPath = process.argv[1];
  return Boolean(entryPath) && import.meta.url === pathToFileURL(entryPath).href;
}

if (isDirectInvocation()) {
  runFluxCli().then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    (error: unknown) => {
      console.error(getErrorMessage(error));
      process.exitCode = 1;
    },
  );
}
