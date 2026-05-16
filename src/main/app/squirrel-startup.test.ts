import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appQuit: vi.fn(),
  getWindowsCliTarget: vi.fn(() => ({
    commandPath: "C:\\Users\\tester\\.flux\\bin\\flux.cmd",
    wrapperPath: "C:\\App\\resources\\cli\\flux.cmd",
  })),
  installWindowsCli: vi.fn(async () => undefined),
  spawn: vi.fn(() => ({ unref: vi.fn() })),
  uninstallWindowsCli: vi.fn(async () => undefined),
}));

vi.mock("electron", () => ({
  app: {
    quit: mocks.appQuit,
  },
}));

vi.mock("node:child_process", () => ({
  spawn: mocks.spawn,
}));

vi.mock("../features/cli/windows-cli-shim", () => ({
  getWindowsCliTarget: mocks.getWindowsCliTarget,
  installWindowsCli: mocks.installWindowsCli,
  uninstallWindowsCli: mocks.uninstallWindowsCli,
}));

import { handleSquirrelStartup } from "./squirrel-startup";

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value,
  });
}

function setExecPath(value: string): void {
  Object.defineProperty(process, "execPath", {
    configurable: true,
    value,
  });
}

describe("squirrel startup", () => {
  beforeEach(() => {
    setPlatform("win32");
    setExecPath("C:\\Users\\tester\\AppData\\Local\\Fluxnotes\\app-1.0.0\\fluxnotes.exe");
    vi.clearAllMocks();
  });

  it("ignores non-Windows startup", async () => {
    setPlatform("darwin");

    await expect(handleSquirrelStartup(["fluxnotes", "--squirrel-install"])).resolves.toBe(false);
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.appQuit).not.toHaveBeenCalled();
  });

  it("ignores normal Windows startup", async () => {
    await expect(handleSquirrelStartup(["fluxnotes"])).resolves.toBe(false);
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.appQuit).not.toHaveBeenCalled();
  });

  it("creates shortcuts and installs CLI during install and update", async () => {
    await expect(handleSquirrelStartup(["fluxnotes", "--squirrel-install"])).resolves.toBe(true);
    await expect(handleSquirrelStartup(["fluxnotes", "--squirrel-updated"])).resolves.toBe(true);

    expect(mocks.spawn).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/Update\.exe$/),
      ["--createShortcut", "fluxnotes.exe"],
      { detached: true, stdio: "ignore" },
    );
    expect(mocks.spawn).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/Update\.exe$/),
      ["--createShortcut", "fluxnotes.exe"],
      { detached: true, stdio: "ignore" },
    );
    expect(mocks.appQuit).toHaveBeenCalledTimes(2);
    expect(mocks.installWindowsCli).toHaveBeenCalledTimes(2);
  });

  it("removes shortcuts and uninstalls CLI during uninstall", async () => {
    await expect(handleSquirrelStartup(["fluxnotes", "--squirrel-uninstall"])).resolves.toBe(true);

    expect(mocks.spawn).toHaveBeenCalledWith(
      expect.stringMatching(/Update\.exe$/),
      ["--removeShortcut", "fluxnotes.exe"],
      { detached: true, stdio: "ignore" },
    );
    expect(mocks.appQuit).toHaveBeenCalledTimes(1);
    expect(mocks.uninstallWindowsCli).toHaveBeenCalledTimes(1);
  });

  it("quits without update command during obsolete event", async () => {
    await expect(handleSquirrelStartup(["fluxnotes", "--squirrel-obsolete"])).resolves.toBe(true);

    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.appQuit).toHaveBeenCalledTimes(1);
  });
});
