import { exec } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

import { businessError, IpcAppError } from "@shared/ipc/result";

import {
  CLI_COMMAND_NAME,
  type CliInstallStatus,
  type CliInstallTarget,
  getCliResourcePath,
} from "./cli-install-target";

const execAsync = promisify(exec);
const MACOS_CLI_PATH = "/usr/local/bin/flux";
const COMMAND_CONFLICT_CODE = "BUSINESS.CONFLICT";

function createCommandConflictError(target: CliInstallTarget): Error {
  return businessError(
    COMMAND_CONFLICT_CODE,
    `Cannot install '${CLI_COMMAND_NAME}' because ${target.commandPath} already exists and is not managed by Fluxnotes.`,
    { commandPath: target.commandPath },
  );
}

function isCommandConflictError(error: unknown): boolean {
  return error instanceof IpcAppError && error.code === COMMAND_CONFLICT_CODE;
}

export function getMacOSCliTarget(): CliInstallTarget {
  return {
    commandPath: MACOS_CLI_PATH,
    wrapperPath: getCliResourcePath(CLI_COMMAND_NAME),
  };
}

async function readOwnedSymlink(target: CliInstallTarget): Promise<string | null> {
  try {
    const linkTarget = await fs.readlink(target.commandPath);
    return linkTarget === target.wrapperPath ? linkTarget : null;
  } catch {
    return null;
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function assertCanReplaceCommand(target: CliInstallTarget): Promise<void> {
  const ownedSymlink = await readOwnedSymlink(target);
  if (ownedSymlink !== null) {
    return;
  }

  try {
    const linkTarget = await fs.readlink(target.commandPath);
    if (linkTarget !== target.wrapperPath) {
      throw createCommandConflictError(target);
    }
    return;
  } catch (error) {
    if (isCommandConflictError(error)) {
      throw error;
    }

    if (!(await pathExists(target.commandPath))) {
      return;
    }
  }

  throw createCommandConflictError(target);
}

async function runWithAdmin(shellCommand: string): Promise<void> {
  const escaped = shellCommand.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await execAsync(`osascript -e 'do shell script "${escaped}" with administrator privileges'`);
}

async function createSymlinkDirectly(target: CliInstallTarget): Promise<boolean> {
  try {
    await fs.rm(target.commandPath, { force: true });
    await fs.symlink(target.wrapperPath, target.commandPath);
    return true;
  } catch {
    return false;
  }
}

export async function getMacOSCliStatus(): Promise<CliInstallStatus> {
  const target = getMacOSCliTarget();
  const installed = (await readOwnedSymlink(target)) !== null;

  return {
    canInstall: true,
    canUninstall: installed,
    commandName: CLI_COMMAND_NAME,
    installed,
    installPath: target.commandPath,
    managedBy: "manual-link",
    targetPath: installed ? target.wrapperPath : null,
  };
}

export async function installMacOSCli(target: CliInstallTarget): Promise<void> {
  await assertCanReplaceCommand(target);
  if (await createSymlinkDirectly(target)) {
    return;
  }

  await runWithAdmin(`ln -sfn '${target.wrapperPath}' '${target.commandPath}'`);
}

export async function uninstallMacOSCli(target: CliInstallTarget): Promise<void> {
  if ((await readOwnedSymlink(target)) === null) {
    return;
  }

  try {
    await fs.rm(target.commandPath, { force: true });
  } catch {
    await runWithAdmin(`rm -f '${target.commandPath}'`);
  }
}
