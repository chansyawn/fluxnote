import { access, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type {
  BackendCommandKey,
  BackendCommandResponse,
} from "@shared/features/entrypoints/commands";
import type { BlockCreatedSource } from "@shared/features/telemetry/contract";

import type { FluxCliCommand } from "./args";
import { dispatchCommand } from "./dispatch-command";
import { resolveGitInfo } from "./git-info";

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
  resolveGitInfo: typeof resolveGitInfo;
  stat: (path: string) => Promise<FileStat>;
  writeFile: typeof writeFile;
}

const defaultDeps: CliExecutorDeps = {
  access,
  cwd: () => process.cwd(),
  dispatchCommand,
  readFile,
  resolveGitInfo,
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

async function resolveAddContent(
  source: Extract<FluxCliCommand, { kind: "add" }>["source"],
  deps: CliExecutorDeps,
): Promise<{
  blockCreatedSource: Extract<BlockCreatedSource, "cli_add_text" | "cli_add_file">;
  content: string;
}> {
  switch (source.type) {
    case "text": {
      return { blockCreatedSource: "cli_add_text", content: source.text };
    }
    case "file": {
      return {
        blockCreatedSource: "cli_add_file",
        content: await readTextFile(source.filePath, deps),
      };
    }
    case "auto": {
      if (await isRegularFile(source.input, deps)) {
        return {
          blockCreatedSource: "cli_add_file",
          content: await readTextFile(source.input, deps),
        };
      }
      return { blockCreatedSource: "cli_add_text", content: source.input };
    }
  }
}

export async function executeOpen(deps: CliExecutorDeps = defaultDeps): Promise<void> {
  await deps.dispatchCommand("app.open", null);
  console.log("Opened Fluxnotes.");
}

export async function executeAddFromText(
  text: string,
  tagNames: string[] = [],
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const result = await deps.dispatchCommand("block.create-from-text", {
    blockCreatedSource: "cli_add_text",
    content: text,
    tagNames,
  });
  console.log(`Created block: ${result.blockId}`);
}

export async function executeAddFromFile(
  filePath: string,
  tagNames: string[] = [],
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  await executeAdd(
    {
      kind: "add",
      source: {
        filePath,
        type: "file",
      },
      tagNames,
    },
    deps,
  );
}

export async function executeAddFromAuto(
  input: string,
  tagNames: string[] = [],
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  await executeAdd(
    {
      kind: "add",
      source: {
        input,
        type: "auto",
      },
      tagNames,
    },
    deps,
  );
}

export async function executeExternalEdit(
  filePath: string,
  tagNames: string[] = [],
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const cwd = deps.cwd();
  const resolvedPath = resolveTextFilePath(filePath, cwd);
  const originalContent = await readTextFile(filePath, deps);
  const git = await deps.resolveGitInfo(cwd);

  try {
    const result = await deps.dispatchCommand("block.create-external-edit", {
      content: originalContent,
      tagNames,
      trigger: {
        cwd,
        git,
        requestedFilePath: filePath,
        source: "cli",
        targetFilePath: resolvedPath,
      },
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
      await executeAdd(command, deps);
      return;
    }
    case "edit": {
      await executeExternalEdit(command.filePath, command.tagNames, deps);
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

async function executeAdd(
  command: Extract<FluxCliCommand, { kind: "add" }>,
  deps: CliExecutorDeps = defaultDeps,
): Promise<void> {
  const { blockCreatedSource, content } = await resolveAddContent(command.source, deps);
  const result = await deps.dispatchCommand("block.create-from-text", {
    blockCreatedSource,
    content,
    tagNames: command.tagNames,
  });
  console.log(`Created block: ${result.blockId}`);
}
