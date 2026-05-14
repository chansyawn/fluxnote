import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appQuit: vi.fn(),
  spawn: vi.fn(() => ({ unref: vi.fn() })),
}));

vi.mock("electron", () => ({
  app: {
    quit: mocks.appQuit,
  },
}));

vi.mock("node:child_process", () => ({
  spawn: mocks.spawn,
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

  it("ignores non-Windows startup", () => {
    setPlatform("darwin");

    expect(handleSquirrelStartup(["fluxnotes", "--squirrel-install"])).toBe(false);
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.appQuit).not.toHaveBeenCalled();
  });

  it("ignores normal Windows startup", () => {
    expect(handleSquirrelStartup(["fluxnotes"])).toBe(false);
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.appQuit).not.toHaveBeenCalled();
  });

  it("creates shortcuts during install and update", () => {
    expect(handleSquirrelStartup(["fluxnotes", "--squirrel-install"])).toBe(true);
    expect(handleSquirrelStartup(["fluxnotes", "--squirrel-updated"])).toBe(true);

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
  });

  it("removes shortcuts during uninstall", () => {
    expect(handleSquirrelStartup(["fluxnotes", "--squirrel-uninstall"])).toBe(true);

    expect(mocks.spawn).toHaveBeenCalledWith(
      expect.stringMatching(/Update\.exe$/),
      ["--removeShortcut", "fluxnotes.exe"],
      { detached: true, stdio: "ignore" },
    );
    expect(mocks.appQuit).toHaveBeenCalledTimes(1);
  });

  it("quits without update command during obsolete event", () => {
    expect(handleSquirrelStartup(["fluxnotes", "--squirrel-obsolete"])).toBe(true);

    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.appQuit).toHaveBeenCalledTimes(1);
  });
});
