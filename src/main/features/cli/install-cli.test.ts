import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  exec: vi.fn(),
  isPackaged: false,
  readlink: vi.fn(),
  rm: vi.fn(),
  symlink: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    access: mocks.access,
    readlink: mocks.readlink,
    rm: mocks.rm,
    symlink: mocks.symlink,
  },
}));

vi.mock("node:child_process", () => ({
  exec: mocks.exec,
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: mocks.isPackaged,
  },
}));

import { installCli, isCliInstalled, uninstallCli } from "./install-cli";

function getTestCliWrapperPath(): string {
  return path.join(process.cwd(), "src", "cli", "flux");
}

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value,
  });
}

describe("install-cli", () => {
  beforeEach(() => {
    setPlatform("darwin");
    mocks.access.mockReset();
    mocks.exec.mockReset();
    mocks.exec.mockImplementation(
      (_cmd, callback: (error: null, stdout: string, stderr: string) => void) => {
        callback(null, "", "");
        return {} as never;
      },
    );
    mocks.readlink.mockReset();
    mocks.rm.mockReset();
    mocks.symlink.mockReset();
  });

  it("detects installed symlink", async () => {
    mocks.readlink.mockResolvedValue(getTestCliWrapperPath());

    await expect(isCliInstalled()).resolves.toBe(true);
  });

  it("installs via direct symlink when possible", async () => {
    mocks.access.mockResolvedValue(undefined);
    mocks.rm.mockResolvedValue(undefined);
    mocks.symlink.mockResolvedValue(undefined);

    await installCli();

    expect(mocks.symlink).toHaveBeenCalled();
  });

  it("uninstalls existing symlink", async () => {
    mocks.readlink.mockResolvedValue(getTestCliWrapperPath());
    mocks.rm.mockResolvedValue(undefined);

    await uninstallCli();

    expect(mocks.rm).toHaveBeenCalled();
  });

  it("throws on non-macos platform", async () => {
    setPlatform("linux");

    await expect(installCli()).rejects.toThrow(/only supported on macOS/);
  });

  it("throws when wrapper file does not exist", async () => {
    mocks.access.mockRejectedValue(new Error("missing"));

    await expect(installCli()).rejects.toThrow(/CLI wrapper not found/);
  });

  it("falls back to admin symlink when direct symlink fails", async () => {
    mocks.access.mockResolvedValue(undefined);
    mocks.rm.mockRejectedValue(new Error("permission denied"));

    await installCli();

    expect(mocks.exec).toHaveBeenCalled();
  });
});
