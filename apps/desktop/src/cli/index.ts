import process from "node:process";
import { pathToFileURL } from "node:url";

import { parseFluxArgs } from "./args";
import { getErrorMessage, resolveExitCode } from "./errors";
import { executeCliCommand } from "./executor";

export async function runFluxCli(argv: readonly string[] = process.argv): Promise<number> {
  const command = parseFluxArgs(argv);
  await executeCliCommand(command);
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
      process.exitCode = resolveExitCode(error);
    },
  );
}
