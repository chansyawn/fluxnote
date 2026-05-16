import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  exec: (() => {
    const exec = vi.fn();
    Object.defineProperty(exec, Symbol.for("nodejs.util.promisify.custom"), {
      value: (command: string) =>
        new Promise<{ stderr: string; stdout: string }>((resolve, reject) => {
          const callback = (error: Error | null, stdout: string, stderr: string): void => {
            if (error) {
              reject(error);
              return;
            }

            resolve({ stderr, stdout });
          };
          exec(command, callback);
        }),
    });
    return exec;
  })(),
  homedir: vi.fn(() => "/Users/tester"),
  isPackaged: false,
  lstat: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
  readlink: vi.fn(),
  rm: vi.fn(),
  symlink: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: mocks.access,
    lstat: mocks.lstat,
    mkdir: mocks.mkdir,
    readFile: mocks.readFile,
    readlink: mocks.readlink,
    rm: mocks.rm,
    symlink: mocks.symlink,
    writeFile: mocks.writeFile,
  },
}));

vi.mock("node:child_process", () => ({
  exec: mocks.exec,
}));

vi.mock("node:os", () => ({
  default: {
    homedir: mocks.homedir,
  },
}));

vi.mock("electron", () => ({
  app: {
    get isPackaged() {
      return mocks.isPackaged;
    },
  },
}));

import { installCli, isCliInstalled, uninstallCli } from "./install-cli";

function getTestCliWrapperPath(fileName = "flux"): string {
  return path.join(process.cwd(), "src", "cli", fileName);
}

function getWindowsCommandPath(): string {
  return path.join("/Users/tester", ".flux", "bin", "flux.cmd");
}

function getWindowsShim(): string {
  return ["@echo off", `call "${getTestCliWrapperPath("flux.cmd")}" %*`, ""].join("\r\n");
}

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value,
  });
}

function readEncodedPowerShell(command: string): string {
  const match = /-EncodedCommand ([^\s]+)/.exec(command);
  if (!match) {
    return "";
  }

  return Buffer.from(match[1], "base64").toString("utf16le");
}

function readPowerShellBase64Payload(command: string): string {
  const script = readEncodedPowerShell(command);
  const match = /FromBase64String\('([^']+)'\)/.exec(script);
  if (!match) {
    return "";
  }

  return Buffer.from(match[1], "base64").toString("utf8");
}

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

function getExecCallback(args: unknown[]): ExecCallback {
  const callback = args.find((arg): arg is ExecCallback => typeof arg === "function");
  if (!callback) {
    throw new Error("Missing exec callback.");
  }

  return callback;
}

describe("install-cli", () => {
  beforeEach(() => {
    setPlatform("darwin");
    vi.clearAllMocks();
    mocks.access.mockResolvedValue(undefined);
    mocks.exec.mockImplementation((...args: unknown[]) => {
      getExecCallback(args)(null, "", "");
      return {} as never;
    });
    mocks.homedir.mockReturnValue("/Users/tester");
    mocks.isPackaged = false;
    mocks.lstat.mockRejectedValue(new Error("missing"));
    mocks.mkdir.mockResolvedValue(undefined);
    mocks.rm.mockResolvedValue(undefined);
    mocks.symlink.mockResolvedValue(undefined);
    mocks.writeFile.mockResolvedValue(undefined);
  });

  it("detects installed macOS symlink", async () => {
    mocks.readlink.mockResolvedValue(getTestCliWrapperPath());

    await expect(isCliInstalled()).resolves.toBe(true);
  });

  it("installs macOS CLI via direct symlink when possible", async () => {
    await installCli();

    expect(mocks.symlink).toHaveBeenCalledWith(getTestCliWrapperPath(), "/usr/local/bin/flux");
  });

  it("uninstalls existing macOS symlink", async () => {
    mocks.readlink.mockResolvedValue(getTestCliWrapperPath());

    await uninstallCli();

    expect(mocks.rm).toHaveBeenCalledWith("/usr/local/bin/flux", { force: true });
  });

  it("falls back to admin symlink when direct macOS symlink fails", async () => {
    mocks.rm.mockRejectedValue(new Error("permission denied"));

    await installCli();

    expect(mocks.exec).toHaveBeenCalledWith(
      expect.stringContaining("osascript"),
      expect.any(Function),
    );
  });

  it("detects installed Windows shim", async () => {
    setPlatform("win32");
    mocks.readFile.mockResolvedValue(getWindowsShim());
    mocks.exec.mockImplementation((...args: unknown[]) => {
      getExecCallback(args)(null, `${path.dirname(getWindowsCommandPath())}\n`, "");
      return {} as never;
    });

    await expect(isCliInstalled()).resolves.toBe(true);
  });

  it("does not report Windows shim as installed when PATH is missing", async () => {
    setPlatform("win32");
    mocks.readFile.mockResolvedValue(getWindowsShim());
    mocks.exec.mockImplementation((...args: unknown[]) => {
      getExecCallback(args)(null, "C:\\Tools\n", "");
      return {} as never;
    });

    await expect(isCliInstalled()).resolves.toBe(false);
  });

  it("installs Windows shim and appends user PATH", async () => {
    setPlatform("win32");
    let execCalls = 0;
    mocks.exec.mockImplementation((...args: unknown[]) => {
      execCalls += 1;
      getExecCallback(args)(null, execCalls === 1 ? "C:\\Tools\n" : "", "");
      return {} as never;
    });

    await installCli();

    expect(mocks.mkdir).toHaveBeenCalledWith(path.dirname(getWindowsCommandPath()), {
      recursive: true,
    });
    expect(mocks.writeFile).toHaveBeenCalledWith(getWindowsCommandPath(), getWindowsShim(), "utf8");
    expect(mocks.exec).toHaveBeenCalledWith(
      expect.stringContaining("-EncodedCommand"),
      expect.any(Function),
    );
    expect(readPowerShellBase64Payload(mocks.exec.mock.calls.at(-1)?.[0] ?? "")).toBe(
      `C:\\Tools;${path.dirname(getWindowsCommandPath())}`,
    );
  });

  it("does not overwrite Windows PATH when reading it fails", async () => {
    setPlatform("win32");
    mocks.exec.mockImplementation((...args: unknown[]) => {
      getExecCallback(args)(new Error("powershell failed"), "", "");
      return {} as never;
    });

    await expect(installCli()).rejects.toThrow(/Failed to read the Windows user PATH/);
    expect(mocks.writeFile).toHaveBeenCalledWith(getWindowsCommandPath(), getWindowsShim(), "utf8");
    expect(mocks.exec).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate Windows PATH segment", async () => {
    setPlatform("win32");
    mocks.exec.mockImplementation((...args: unknown[]) => {
      getExecCallback(args)(null, `${path.dirname(getWindowsCommandPath())}\n`, "");
      return {} as never;
    });

    await installCli();

    expect(mocks.exec).toHaveBeenCalledTimes(1);
  });

  it("uninstalls Windows shim and removes user PATH segment", async () => {
    setPlatform("win32");
    mocks.readFile.mockResolvedValue(getWindowsShim());
    let execCalls = 0;
    mocks.exec.mockImplementation((...args: unknown[]) => {
      execCalls += 1;
      getExecCallback(args)(
        null,
        execCalls === 1 ? `C:\\Tools;${path.dirname(getWindowsCommandPath())}\n` : "",
        "",
      );
      return {} as never;
    });

    await uninstallCli();

    expect(mocks.rm).toHaveBeenCalledWith(getWindowsCommandPath(), { force: true });
    expect(readPowerShellBase64Payload(mocks.exec.mock.calls.at(-1)?.[0] ?? "")).toBe("C:\\Tools");
    expect(readEncodedPowerShell(mocks.exec.mock.calls.at(-1)?.[0] ?? "")).toContain(
      "SetEnvironmentVariable",
    );
  });

  it("throws on unsupported platform", async () => {
    setPlatform("linux");

    await expect(installCli()).rejects.toThrow(/macOS and Windows/);
  });

  it("throws when wrapper file does not exist", async () => {
    mocks.access.mockRejectedValue(new Error("missing"));

    await expect(installCli()).rejects.toThrow(/CLI wrapper not found/);
  });

  it("does not replace non-owned macOS command path", async () => {
    mocks.readlink.mockResolvedValue("/usr/local/bin/other-flux");
    mocks.lstat.mockResolvedValue({ isFile: () => true });

    await expect(installCli()).rejects.toThrow(/already exists/);
    expect(mocks.symlink).not.toHaveBeenCalled();
  });
});
