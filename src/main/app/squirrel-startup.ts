import { spawn } from "node:child_process";
import path from "node:path";

import { app } from "electron";

const SQUIRREL_EVENTS = new Set([
  "--squirrel-install",
  "--squirrel-updated",
  "--squirrel-uninstall",
  "--squirrel-obsolete",
]);

function getSquirrelEvent(argv: readonly string[]): string | null {
  return argv.find((arg) => SQUIRREL_EVENTS.has(arg)) ?? null;
}

function getUpdateExePath(): string {
  return path.win32.resolve(path.win32.dirname(process.execPath), "..", "Update.exe");
}

function runUpdateExe(args: readonly string[]): void {
  spawn(getUpdateExePath(), [...args], {
    detached: true,
    stdio: "ignore",
  }).unref();
}

export function handleSquirrelStartup(argv: readonly string[] = process.argv): boolean {
  if (process.platform !== "win32") {
    return false;
  }

  const squirrelEvent = getSquirrelEvent(argv);
  if (!squirrelEvent) {
    return false;
  }

  switch (squirrelEvent) {
    case "--squirrel-install":
    case "--squirrel-updated": {
      runUpdateExe(["--createShortcut", path.win32.basename(process.execPath)]);
      break;
    }
    case "--squirrel-uninstall": {
      runUpdateExe(["--removeShortcut", path.win32.basename(process.execPath)]);
      break;
    }
    case "--squirrel-obsolete": {
      break;
    }
  }

  app.quit();
  return true;
}
