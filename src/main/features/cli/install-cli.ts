import { exec } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { APP_USER_DATA_DIR_NAME } from "@shared/app/app-config";
import { businessError, internalError } from "@shared/ipc/result";
import { app } from "electron";

const execAsync = promisify(exec);

const MACOS_CLI_PATH = "/usr/local/bin/flux";
const WINDOWS_CLI_DIR_NAME = "bin";
const WINDOWS_CLI_FILE_NAME = "flux.cmd";

interface CliInstallTarget {
  commandPath: string;
  wrapperPath: string;
}

function getCliResourcePath(fileName: string): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "cli", fileName);
  }

  return path.join(process.cwd(), "src", "cli", fileName);
}

function getWindowsCliDirectory(): string {
  return path.join(os.homedir(), APP_USER_DATA_DIR_NAME, WINDOWS_CLI_DIR_NAME);
}

function getCliInstallTarget(): CliInstallTarget {
  if (process.platform === "win32") {
    return {
      commandPath: path.join(getWindowsCliDirectory(), WINDOWS_CLI_FILE_NAME),
      wrapperPath: getCliResourcePath(WINDOWS_CLI_FILE_NAME),
    };
  }

  return {
    commandPath: MACOS_CLI_PATH,
    wrapperPath: getCliResourcePath("flux"),
  };
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isSameFileContent(filePath: string, expectedContent: string): Promise<boolean> {
  try {
    return (await fs.readFile(filePath, "utf8")) === expectedContent;
  } catch {
    return false;
  }
}

function splitWindowsPath(value: string): string[] {
  return value
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeWindowsPathSegment(value: string): string {
  return path.resolve(value).toLowerCase();
}

async function readWindowsUserPath(): Promise<string> {
  if (process.platform !== "win32") {
    return "";
  }

  const script = "[Environment]::GetEnvironmentVariable('Path', 'User')";
  const encoded = Buffer.from(script, "utf16le").toString("base64");

  try {
    const { stdout } = await execAsync(
      `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    );
    return stdout.trim();
  } catch (error) {
    throw internalError("Failed to read the Windows user PATH.", error);
  }
}

async function writeWindowsUserPath(value: string): Promise<void> {
  const payload = Buffer.from(value, "utf8").toString("base64");
  const script =
    "$value = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('" +
    payload +
    "')); [Environment]::SetEnvironmentVariable('Path', $value, 'User')";
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  await execAsync(`powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`);
}

async function ensureWindowsPathDirectory(cliDirectory: string): Promise<void> {
  const currentPath = await readWindowsUserPath();
  const segments = splitWindowsPath(currentPath);
  const normalizedCliDirectory = normalizeWindowsPathSegment(cliDirectory);
  const alreadyPresent = segments.some(
    (segment) => normalizeWindowsPathSegment(segment) === normalizedCliDirectory,
  );

  if (alreadyPresent) {
    return;
  }

  await writeWindowsUserPath([...segments, cliDirectory].join(";"));
}

async function removeWindowsPathDirectory(cliDirectory: string): Promise<void> {
  const currentPath = await readWindowsUserPath();
  const normalizedCliDirectory = normalizeWindowsPathSegment(cliDirectory);
  const currentSegments = splitWindowsPath(currentPath);
  const segments = currentSegments.filter(
    (segment) => normalizeWindowsPathSegment(segment) !== normalizedCliDirectory,
  );

  if (segments.length === currentSegments.length) {
    return;
  }

  await writeWindowsUserPath(segments.join(";"));
}

function createWindowsShim(wrapperPath: string): string {
  return ["@echo off", `call "${wrapperPath}" %*`, ""].join("\r\n");
}

export async function isCliInstalled(): Promise<boolean> {
  const target = getCliInstallTarget();

  if (process.platform === "win32") {
    return await isSameFileContent(target.commandPath, createWindowsShim(target.wrapperPath));
  }

  try {
    const linkTarget = await fs.readlink(target.commandPath);
    return linkTarget === target.wrapperPath;
  } catch {
    return false;
  }
}

async function tryDirectSymlink(target: CliInstallTarget): Promise<boolean> {
  try {
    await fs.rm(target.commandPath, { force: true });
    await fs.symlink(target.wrapperPath, target.commandPath);
    return true;
  } catch {
    return false;
  }
}

async function runWithAdmin(shellCommand: string): Promise<void> {
  const escaped = shellCommand.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  await execAsync(`osascript -e 'do shell script "${escaped}" with administrator privileges'`);
}

async function createSymlinkWithAdmin(target: CliInstallTarget): Promise<void> {
  await runWithAdmin(`ln -sf '${target.wrapperPath}' '${target.commandPath}'`);
}

async function installMacOSCli(target: CliInstallTarget): Promise<void> {
  if (await tryDirectSymlink(target)) {
    return;
  }

  await createSymlinkWithAdmin(target);
}

async function installWindowsCli(target: CliInstallTarget): Promise<void> {
  await fs.mkdir(path.dirname(target.commandPath), { recursive: true });
  await fs.writeFile(target.commandPath, createWindowsShim(target.wrapperPath), "utf8");
  await ensureWindowsPathDirectory(path.dirname(target.commandPath));
}

async function uninstallMacOSCli(target: CliInstallTarget): Promise<void> {
  if (!(await isCliInstalled())) {
    return;
  }

  try {
    await fs.rm(target.commandPath, { force: true });
  } catch {
    await runWithAdmin(`rm -f '${target.commandPath}'`);
  }
}

async function uninstallWindowsCli(target: CliInstallTarget): Promise<void> {
  if (await isCliInstalled()) {
    await fs.rm(target.commandPath, { force: true });
  }

  await removeWindowsPathDirectory(path.dirname(target.commandPath));
}

function assertSupported(): void {
  if (process.platform === "darwin" || process.platform === "win32") {
    return;
  }

  throw businessError(
    "BUSINESS.NOT_SUPPORTED",
    "CLI installation is only supported on macOS and Windows.",
  );
}

export async function installCli(): Promise<void> {
  assertSupported();

  const target = getCliInstallTarget();
  if (!(await pathExists(target.wrapperPath))) {
    throw businessError(
      "BUSINESS.NOT_FOUND",
      `CLI wrapper not found at ${target.wrapperPath}. Run 'vp run package' or 'vp run dev' first.`,
    );
  }

  if (process.platform === "win32") {
    await installWindowsCli(target);
    return;
  }

  await installMacOSCli(target);
}

export async function uninstallCli(): Promise<void> {
  assertSupported();

  const target = getCliInstallTarget();
  if (process.platform === "win32") {
    await uninstallWindowsCli(target);
    return;
  }

  await uninstallMacOSCli(target);
}
