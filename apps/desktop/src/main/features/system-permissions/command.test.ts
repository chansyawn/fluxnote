import { describe, expect, it, vi } from "vite-plus/test";

import { registerSystemPermissionsCommands } from "./command";

describe("system permissions command", () => {
  it("registers permission status, request, and settings commands", async () => {
    const handlers = new Map<string, (input: { permission: "macos_accessibility" }) => unknown>();
    const service = {
      getStatus: vi.fn(() => ({
        granted: false,
        permission: "macos_accessibility" as const,
        supported: true,
      })),
      openSettings: vi.fn(async () => undefined),
      request: vi.fn(() => ({
        granted: true,
        permission: "macos_accessibility" as const,
        supported: true,
      })),
    };
    const ipc = {
      command: vi.fn(
        (name: string, handler: (input: { permission: "macos_accessibility" }) => unknown) => {
          handlers.set(name, handler);
        },
      ),
    };

    registerSystemPermissionsCommands(ipc as never, { service });

    expect(handlers.get("system-permissions.get")?.({ permission: "macos_accessibility" })).toEqual(
      {
        granted: false,
        permission: "macos_accessibility",
        supported: true,
      },
    );
    await handlers.get("system-permissions.open-settings")?.({
      permission: "macos_accessibility",
    });
    expect(
      handlers.get("system-permissions.request")?.({ permission: "macos_accessibility" }),
    ).toEqual({
      granted: true,
      permission: "macos_accessibility",
      supported: true,
    });
    expect(service.openSettings).toHaveBeenCalledWith("macos_accessibility");
  });
});
