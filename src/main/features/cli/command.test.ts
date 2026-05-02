import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  installCli: vi.fn(),
  isCliInstalled: vi.fn(),
  uninstallCli: vi.fn(),
}));

vi.mock("./install-cli", () => mocks);

import { registerCliCommands } from "./command";

describe("cli command", () => {
  it("dispatches install/status/uninstall commands", async () => {
    const handlers = new Map<string, () => Promise<unknown>>();
    const ipc = {
      command: vi.fn((name: string, handler: () => Promise<unknown>) =>
        handlers.set(name, handler),
      ),
    };
    mocks.isCliInstalled.mockResolvedValue(true);

    registerCliCommands(ipc as never);

    await expect(handlers.get("cli.install")?.()).resolves.toBeUndefined();
    await expect(handlers.get("cli.status")?.()).resolves.toEqual({ installed: true });
    await expect(handlers.get("cli.uninstall")?.()).resolves.toBeUndefined();

    expect(mocks.installCli).toHaveBeenCalled();
    expect(mocks.uninstallCli).toHaveBeenCalled();
  });
});
