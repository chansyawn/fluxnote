import { spawn } from "node:child_process";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { waitForServer } from "./transport";

const PRODUCTION_SERVER_WAIT_MS = 3_000;
const DEVELOPMENT_SERVER_WAIT_MS = 15_000;

type CliContext =
  | { mode: "production"; appPath: string; launchArgs: string[]; probePath: string }
  | { mode: "development"; repoRoot: string };

function getProductionCandidates(cliDir: string): CliContext[] {
  const resourcesDir = path.resolve(cliDir, "..");
  const appDir = path.resolve(resourcesDir, "..");

  if (process.platform === "darwin") {
    const contentsDir = appDir;
    const appBundlePath = path.dirname(contentsDir);
    const executablePath = path.join(contentsDir, "MacOS", "Fluxnotes");
    return [
      {
        appPath: "open",
        launchArgs: ["-a", appBundlePath],
        mode: "production",
        probePath: executablePath,
      },
    ];
  }

  if (process.platform === "win32") {
    const executableName = "Fluxnotes.exe";
    return [
      {
        appPath: path.join(appDir, executableName),
        launchArgs: [],
        mode: "production" as const,
        probePath: path.join(appDir, executableName),
      },
    ];
  }

  const executablePath = path.join(appDir, "fluxnotes");
  return [
    {
      appPath: executablePath,
      launchArgs: [],
      mode: "production",
      probePath: executablePath,
    },
  ];
}

async function isProductionCandidate(context: CliContext): Promise<boolean> {
  if (context.mode !== "production") {
    return false;
  }

  try {
    const s = await stat(context.probePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function getCliContext(): Promise<CliContext> {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));

  for (const context of getProductionCandidates(cliDir)) {
    if (await isProductionCandidate(context)) {
      return context;
    }
  }

  const rootDir = path.resolve(cliDir, "../..");
  try {
    await access(path.join(rootDir, "package.json"));
    await access(path.join(rootDir, "src/main/index.ts"));
    return { mode: "development", repoRoot: rootDir };
  } catch {
    // Not in a dev repo either.
  }

  throw new Error("Cannot determine Fluxnotes location. Reinstall the application.");
}

function launchApp(context: CliContext): void {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  if (context.mode === "production") {
    spawn(context.appPath, context.launchArgs, {
      detached: true,
      env,
      stdio: "ignore",
    }).unref();
    return;
  }

  spawn("vp", ["run", "dev"], {
    cwd: context.repoRoot,
    detached: true,
    env,
    stdio: "ignore",
  }).unref();
}

export async function launchAppAndWaitForServer(): Promise<void> {
  const context = await getCliContext();
  const waitMs =
    context.mode === "production" ? PRODUCTION_SERVER_WAIT_MS : DEVELOPMENT_SERVER_WAIT_MS;

  launchApp(context);
  await waitForServer(waitMs);
}
