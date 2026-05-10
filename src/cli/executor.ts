import { access, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";

import type { FluxCliCommand } from "./args";
import { dispatchCommand } from "./ipc-dispatcher";

interface FileStat {
  isFile: () => boolean;
}

interface CliExecutorDeps {
  access: typeof access;
  cwd: () => string;
  dispatchCommand: <TKey extends BackendCommandKey>(
    command: TKey,
    payload: unknown,
  ) => Promise<BackendCommandResponse<TKey>>;
  readFile: typeof readFile;
  stat: (path: string) => Promise<FileStat>;
  writeFile: typeof writeFile;
}

const defaultDeps: CliExecutorDeps = {
  access,
  cwd: () => process.cwd(),
  dispatchCommand,
  readFile,
  stat,
  writeFile,
};

function resolveTextFilePath(filePath: string, cwd: string): string {
  return path.resolve(cwd, filePath);
}

async function isRegularFile(filePath: string, deps: CliExecutorDeps): Promise<boolean> {
  try {
    const fileStat = await deps.stat(resolveTextFilePath(filePath, deps.cwd()));
    return fileStat.isFile();
  } catch {
    return false;
  }
}

async function readTextFile(filePath: string, deps: CliExecutorDeps): Promise<string> {
  const resolvedPath = resolveTextFilePath(filePath, deps.cwd());
  await deps.access(resolvedPath);
  const fileStat = await deps.stat(resolvedPath);
  if (!fileStat.isFile()) {
    throw new Error(`Expected a file path: ${filePath}`);
  }

  return await deps.readFile(resolvedPath, "utf8");
}

export async function executeOpen(deps: CliExecutorDeps = defaultDeps): Promise<void> {
  await deps.dispatchCommand("app.open", null);
  console.log("Opened Fluxnotes.");
}

export async function executeAddFromText(
  text: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const result = await deps.dispatchCommand("block.create-from-text", { content: text });
  console.log(`Created block: ${result.blockId}`);
}

export async function executeAddFromFile(
  filePath: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const content = await readTextFile(filePath, deps);
  await executeAddFromText(content, deps);
}

export async function executeAddFromAuto(
  input: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  if (await isRegularFile(input, deps)) {
    await executeAddFromFile(input, deps);
    return;
  }

  await executeAddFromText(input, deps);
}

export async function executeExternalEdit(
  filePath: string,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const resolvedPath = resolveTextFilePath(filePath, deps.cwd());
  const originalContent = await readTextFile(filePath, deps);

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
  switch (command.kind) {
    case "add": {
      if (command.source.type === "text") {
        await executeAddFromText(command.source.text, deps);
        return;
      }

      if (command.source.type === "file") {
        await executeAddFromFile(command.source.filePath, deps);
        return;
      }

      await executeAddFromAuto(command.source.input, deps);
      return;
    }
    case "edit": {
      await executeExternalEdit(command.filePath, deps);
      return;
    }
    case "help": {
      return;
    }
    case "open": {
      await executeOpen(deps);
      return;
    }
  }
}
