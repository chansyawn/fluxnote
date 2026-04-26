import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { dispatchCommand } from "./cli-ipc-client";
import { parseFluxArgs } from "./parse-args";

async function readTextFile(filePath: string): Promise<string> {
  const resolvedPath = path.resolve(process.cwd(), filePath);
  await access(resolvedPath);
  return await readFile(resolvedPath, "utf8");
}

function resolveTextFilePath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

async function runExternalEdit(filePath: string): Promise<void> {
  const resolvedPath = resolveTextFilePath(filePath);
  await access(resolvedPath);
  const originalContent = await readFile(resolvedPath, "utf8");

  try {
    const result = await dispatchCommand("block.createExternalEdit", {
      content: originalContent,
    });
    if (result.status === "submitted") {
      await writeFile(resolvedPath, result.content, "utf8");
    }
  } catch (error) {
    await writeFile(resolvedPath, originalContent, "utf8").catch(() => undefined);
    throw error;
  }
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

export async function runFluxCli(argv: readonly string[] = process.argv): Promise<number> {
  const command = parseFluxArgs(argv);

  if (command.kind === "help") {
    return 0;
  }

  if (command.kind === "open") {
    await dispatchCommand("app.open", null);
    console.log("Opened FluxNote.");
    return 0;
  }

  if (command.source.type === "file" && command.source.edit) {
    await runExternalEdit(command.source.filePath);
    return 0;
  }

  const content =
    command.source.type === "text"
      ? command.source.text
      : await readTextFile(command.source.filePath);
  const result = await dispatchCommand("block.createFromText", { content });
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
