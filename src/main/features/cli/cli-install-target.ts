import fs from "node:fs/promises";
import path from "node:path";

import { businessError } from "@shared/ipc/result";
import { app } from "electron";

export const CLI_COMMAND_NAME = "flux";

export interface CliInstallTarget {
  commandPath: string;
  wrapperPath: string;
}

export type CliInstallManager = "manual-link" | "user-path-shim" | "unsupported";

export interface CliInstallStatus {
  canInstall: boolean;
  canUninstall: boolean;
  commandName: typeof CLI_COMMAND_NAME;
  installed: boolean;
  installPath: string | null;
  managedBy: CliInstallManager;
  targetPath: string | null;
}

export function getCliResourcePath(fileName: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "cli", fileName);
  }

  return path.join(process.cwd(), "src", "cli", fileName);
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function assertCliPlatformSupported(): void {
  if (process.platform === "darwin" || process.platform === "win32") {
    return;
  }

  throw businessError(
    "BUSINESS.NOT_SUPPORTED",
    "CLI installation is only supported on macOS and Windows.",
  );
}

export async function assertCliWrapperExists(target: CliInstallTarget): Promise<void> {
  if (await pathExists(target.wrapperPath)) {
    return;
  }

  throw businessError(
    "BUSINESS.NOT_FOUND",
    `CLI wrapper not found at ${target.wrapperPath}. Run 'vp run package' or 'vp run dev' first.`,
  );
}

export function createUnsupportedCliStatus(): CliInstallStatus {
  return {
    canInstall: false,
    canUninstall: false,
    commandName: CLI_COMMAND_NAME,
    installed: false,
    installPath: null,
    managedBy: "unsupported",
    targetPath: null,
  };
}
