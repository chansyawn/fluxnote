import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCliStatus: vi.fn(),
  installCli: vi.fn(),
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
    mocks.getCliStatus.mockResolvedValue({
      canInstall: true,
      canUninstall: true,
      commandName: "flux",
      installed: true,
      installPath: "/usr/local/bin/flux",
      managedBy: "manual-link",
      targetPath: "/Applications/Fluxnotes.app/Contents/Resources/cli/flux",
    });

    registerCliCommands(ipc as never);

    await expect(handlers.get("cli.install")?.()).resolves.toBeUndefined();
    await expect(handlers.get("cli.status")?.()).resolves.toMatchObject({ installed: true });
    await expect(handlers.get("cli.uninstall")?.()).resolves.toBeUndefined();

    expect(mocks.installCli).toHaveBeenCalled();
    expect(mocks.uninstallCli).toHaveBeenCalled();
  });
});
