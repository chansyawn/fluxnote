import { access, readFile } from "node:fs/promises";
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
