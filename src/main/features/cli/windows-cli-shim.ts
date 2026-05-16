import { exec } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { APP_USER_DATA_DIR_NAME } from "@shared/app/app-config";
import { internalError } from "@shared/ipc/result";

import {
  CLI_COMMAND_NAME,
  type CliInstallStatus,
  type CliInstallTarget,
  getCliResourcePath,
} from "./cli-install-target";

const execAsync = promisify(exec);
const WINDOWS_CLI_DIR_NAME = "bin";
const WINDOWS_CLI_FILE_NAME = `${CLI_COMMAND_NAME}.cmd`;

export function getWindowsCliDirectory(): string {
  return path.join(os.homedir(), APP_USER_DATA_DIR_NAME, WINDOWS_CLI_DIR_NAME);
}

export function getWindowsCliTarget(): CliInstallTarget {
  return {
    commandPath: path.join(getWindowsCliDirectory(), WINDOWS_CLI_FILE_NAME),
    wrapperPath: getCliResourcePath(WINDOWS_CLI_FILE_NAME),
  };
}

function splitWindowsPath(value: string): string[] {
  return value
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeWindowsPathSegment(value: string): string {
  return path.win32.resolve(value).toLowerCase();
}

function encodePowerShell(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

async function runPowerShell(script: string): Promise<string> {
  const encoded = encodePowerShell(script);
  const { stdout } = await execAsync(
    `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
  );
  return stdout.trim();
}

async function readWindowsUserPath(): Promise<string> {
  try {
    return await runPowerShell("[Environment]::GetEnvironmentVariable('Path', 'User')");
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
  await runPowerShell(script);
}

async function hasWindowsPathDirectory(cliDirectory: string): Promise<boolean> {
  const currentPath = await readWindowsUserPath();
  const normalizedCliDirectory = normalizeWindowsPathSegment(cliDirectory);
  return splitWindowsPath(currentPath).some(
    (segment) => normalizeWindowsPathSegment(segment) === normalizedCliDirectory,
  );
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

async function isSameFileContent(filePath: string, expectedContent: string): Promise<boolean> {
  try {
    return (await fs.readFile(filePath, "utf8")) === expectedContent;
  } catch {
    return false;
  }
}

export async function getWindowsCliStatus(): Promise<CliInstallStatus> {
  const target = getWindowsCliTarget();
  const cliDirectory = path.dirname(target.commandPath);
  const ownsShim = await isSameFileContent(
    target.commandPath,
    createWindowsShim(target.wrapperPath),
  );
  const pathReady = await hasWindowsPathDirectory(cliDirectory);
  const installed = ownsShim && pathReady;

  return {
    canInstall: true,
    canUninstall: ownsShim || pathReady,
    commandName: CLI_COMMAND_NAME,
    installed,
    installPath: target.commandPath,
    managedBy: "user-path-shim",
    targetPath: ownsShim ? target.wrapperPath : null,
  };
}

export async function installWindowsCli(target: CliInstallTarget): Promise<void> {
  await fs.mkdir(path.dirname(target.commandPath), { recursive: true });
  await fs.writeFile(target.commandPath, createWindowsShim(target.wrapperPath), "utf8");
  await ensureWindowsPathDirectory(path.dirname(target.commandPath));
}

export async function uninstallWindowsCli(target: CliInstallTarget): Promise<void> {
  if (await isSameFileContent(target.commandPath, createWindowsShim(target.wrapperPath))) {
    await fs.rm(target.commandPath, { force: true });
  }

  await removeWindowsPathDirectory(path.dirname(target.commandPath));
}
