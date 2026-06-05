import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vite-plus/test";

const execFileAsync = promisify(execFile);
const sourceWrapperPath = fileURLToPath(new URL("./flux", import.meta.url));
const createdDirectories: string[] = [];

async function writeExecutable(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
  await chmod(filePath, 0o755);
}

async function writeFluxWrapper(filePath: string): Promise<void> {
  await writeExecutable(filePath, await readFile(sourceWrapperPath, "utf8"));
}

async function writeFakeElectron(filePath: string): Promise<void> {
  await writeExecutable(
    filePath,
    [
      "#!/usr/bin/env bash",
      'printf "electron=%s\\n" "$0"',
      'printf "run_as_node=%s\\n" "$ELECTRON_RUN_AS_NODE"',
      'printf "cli=%s\\n" "$1"',
      'printf "arg=%s\\n" "$2"',
    ].join("\n"),
  );
}

async function createTempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "fluxnotes-cli-wrapper-"));
  createdDirectories.push(directory);
  return directory;
}

describe("flux wrapper", () => {
  afterEach(async () => {
    await Promise.all(
      createdDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true })),
    );
  });

  it("uses packaged macOS resources before development fallbacks", async () => {
    const directory = await createTempDirectory();
    const contentsDir = path.join(directory, "Fluxnotes.app", "Contents");
    const wrapperPath = path.join(contentsDir, "Resources", "cli", "flux");
    const electronPath = path.join(contentsDir, "MacOS", "Fluxnotes");
    const cliScriptPath = path.join(contentsDir, "Resources", "cli", "flux-cli.mjs");

    await writeFluxWrapper(wrapperPath);
    await writeFakeElectron(electronPath);
    await writeFile(cliScriptPath, "", "utf8");

    const { stdout } = await execFileAsync(wrapperPath, ["--help"]);

    expect(stdout).toContain(`electron=${electronPath}`);
    expect(stdout).toContain("run_as_node=1");
    expect(stdout).toContain(`cli=${cliScriptPath}`);
    expect(stdout).toContain("arg=--help");
  });

  it("finds Electron in the workspace root for development installs", async () => {
    const directory = await createTempDirectory();
    const appRoot = path.join(directory, "apps", "desktop");
    const wrapperPath = path.join(appRoot, "src", "cli", "flux");
    const electronPath = path.join(
      directory,
      "node_modules",
      "electron",
      "dist",
      "Electron.app",
      "Contents",
      "MacOS",
      "Electron",
    );
    const cliScriptPath = path.join(appRoot, ".vite", "cli", "flux-cli.mjs");

    await writeFluxWrapper(wrapperPath);
    await writeFakeElectron(electronPath);
    await mkdir(path.dirname(cliScriptPath), { recursive: true });
    await writeFile(cliScriptPath, "", "utf8");

    const { stdout } = await execFileAsync(wrapperPath, ["--help"]);

    expect(stdout).toContain(`electron=${electronPath}`);
    expect(stdout).toContain("run_as_node=1");
    expect(stdout).toContain(`cli=${cliScriptPath}`);
    expect(stdout).toContain("arg=--help");
  });

  it("reports a missing Electron binary before running the CLI script", async () => {
    const directory = await createTempDirectory();
    const appRoot = path.join(directory, "apps", "desktop");
    const wrapperPath = path.join(appRoot, "src", "cli", "flux");
    const cliScriptPath = path.join(appRoot, ".vite", "cli", "flux-cli.mjs");

    await writeFluxWrapper(wrapperPath);
    await mkdir(path.dirname(cliScriptPath), { recursive: true });
    await writeFile(cliScriptPath, "", "utf8");

    await expect(execFileAsync(wrapperPath, ["--help"])).rejects.toMatchObject({
      stderr: expect.stringContaining("Electron binary not found."),
    });
  });
});
