import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";

import type { FluxCliCommand } from "./args";
import { dispatchCommand } from "./ipc-dispatcher";

interface CliExecutorDeps {
  access: typeof access;
  cwd: () => string;
  dispatchCommand: <TKey extends BackendCommandKey>(
    command: TKey,
    payload: unknown,
  ) => Promise<BackendCommandResponse<TKey>>;
  readFile: typeof readFile;
  writeFile: typeof writeFile;
}

const defaultDeps: CliExecutorDeps = {
  access,
  cwd: () => process.cwd(),
  dispatchCommand,
  readFile,
  writeFile,
};

function resolveTextFilePath(filePath: string, cwd: string): string {
  return path.resolve(cwd, filePath);
}

export async function executeOpen(deps: CliExecutorDeps = defaultDeps): Promise<void> {
  await deps.dispatchCommand("app.open", null);
  console.log("Opened Fluxnotes.");
}

export async function executeCreateFromText(
  text: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const result = await deps.dispatchCommand("block.create-from-text", { content: text });
  console.log(`Created block: ${result.blockId}`);
}

export async function executeCreateFromFile(
  filePath: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const resolvedPath = resolveTextFilePath(filePath, deps.cwd());
  await deps.access(resolvedPath);
  const content = await deps.readFile(resolvedPath, "utf8");
  const result = await deps.dispatchCommand("block.create-from-text", { content });
  console.log(`Created block: ${result.blockId}`);
}

export async function executeExternalEdit(
  filePath: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const resolvedPath = resolveTextFilePath(filePath, deps.cwd());
  await deps.access(resolvedPath);
  const originalContent = await deps.readFile(resolvedPath, "utf8");

  try {
    const result = await deps.dispatchCommand("block.create-external-edit", {
      content: originalContent,
    });
    if (result.status === "submitted") {
      await deps.writeFile(resolvedPath, result.content, "utf8");
    }
  } catch (error) {
    await deps.writeFile(resolvedPath, originalContent, "utf8").catch(() => undefined);
    throw error;
  }
}

export async function executeCliCommand(
  command: FluxCliCommand,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  if (command.kind === "help") {
    return;
  }

  if (command.kind === "open") {
    await executeOpen(deps);
    return;
  }

  if (command.source.type === "text") {
    await executeCreateFromText(command.source.text, deps);
    return;
  }

  if (command.edit) {
    await executeExternalEdit(command.source.filePath, deps);
    return;
  }

  await executeCreateFromFile(command.source.filePath, deps);
}
