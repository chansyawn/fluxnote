import { exec } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { businessError } from "@shared/ipc/errors";
import { app } from "electron";

const execAsync = promisify(exec);

const CLI_SYMLINK_PATH = "/usr/local/bin/flux";

function getCliWrapperPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "cli", "flux");
  }
  return path.join(process.cwd(), "src", "cli", "flux");
}

export async function isCliInstalled(): Promise<boolean> {
  try {
    const target = await fs.readlink(CLI_SYMLINK_PATH);
    return target === getCliWrapperPath();
  } catch {
    return false;
  }
}

async function tryDirectSymlink(wrapperPath: string): Promise<boolean> {
  try {
    await fs.rm(CLI_SYMLINK_PATH, { force: true });
    await fs.symlink(wrapperPath, CLI_SYMLINK_PATH);
    return true;
  } catch {
    return false;
  }
}

async function runWithAdmin(shellCommand: string): Promise<void> {
  const escaped = shellCommand.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await execAsync(`osascript -e 'do shell script "${escaped}" with administrator privileges'`);
}

async function createSymlinkWithAdmin(wrapperPath: string): Promise<void> {
  await runWithAdmin(`ln -sf '${wrapperPath}' '${CLI_SYMLINK_PATH}'`);
}

function assertSupported(): void {
  if (process.platform !== "darwin") {
    throw businessError("BUSINESS.NOT_SUPPORTED", "CLI installation is only supported on macOS.");
  }
}

export async function installCli(): Promise<void> {
  assertSupported();

  const wrapperPath = getCliWrapperPath();
  try {
    await fs.access(wrapperPath);
  } catch {
    throw businessError(
      "BUSINESS.NOT_FOUND",
      `CLI wrapper not found at ${wrapperPath}. Run 'vp run cli:build' first.`,
    );
  }

  if (await tryDirectSymlink(wrapperPath)) {
    return;
  }

  await createSymlinkWithAdmin(wrapperPath);
}

export async function uninstallCli(): Promise<void> {
  assertSupported();

  const installed = await isCliInstalled();
  if (!installed) {
    return;
  }

  try {
    await fs.rm(CLI_SYMLINK_PATH, { force: true });
  } catch {
    await runWithAdmin(`rm -f '${CLI_SYMLINK_PATH}'`);
  }
}
