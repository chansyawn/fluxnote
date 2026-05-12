import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  registerAssetsCommands: vi.fn(),
  registerBlocksCommands: vi.fn(),
  registerClipboardCommands: vi.fn(),
  registerCliCommands: vi.fn(),
  registerExternalEditCommands: vi.fn(),
  registerExternalUrlCommands: vi.fn(),
  registerOpenBlockCommands: vi.fn(),
  registerPreferencesCommands: vi.fn(),
  registerShortcutCommands: vi.fn(),
  registerTagsCommands: vi.fn(),
  registerWindowCommands: vi.fn(),
}));

vi.mock("../features/assets/command", () => ({
  registerAssetsCommands: mocks.registerAssetsCommands,
}));
vi.mock("../features/blocks/command", () => ({
  registerBlocksCommands: mocks.registerBlocksCommands,
}));
vi.mock("../features/clipboard", () => ({
  registerClipboardCommands: mocks.registerClipboardCommands,
}));
vi.mock("../features/cli/command", () => ({ registerCliCommands: mocks.registerCliCommands }));
vi.mock("../features/external-edit/command", () => ({
  registerExternalEditCommands: mocks.registerExternalEditCommands,
}));
vi.mock("../features/external-url", () => ({
  registerExternalUrlCommands: mocks.registerExternalUrlCommands,
}));
vi.mock("../features/open-block/command", () => ({
  registerOpenBlockCommands: mocks.registerOpenBlockCommands,
}));
vi.mock("../features/preferences/command", () => ({
  registerPreferencesCommands: mocks.registerPreferencesCommands,
}));
vi.mock("../features/shortcut/command", () => ({
  registerShortcutCommands: mocks.registerShortcutCommands,
}));
vi.mock("../features/tags/command", () => ({ registerTagsCommands: mocks.registerTagsCommands }));
vi.mock("../features/window/command", () => ({
  registerWindowCommands: mocks.registerWindowCommands,
}));

import { registerFeatureCommands } from "./register-commands";

describe("registerFeatureCommands", () => {
  it("registers all feature commands and finalizes ipc registration", () => {
    const ipc = { register: vi.fn() } as never;
    const deps = {
      db: { marker: "db" },
      events: { emit: vi.fn() },
      externalEditManager: { listSessions: vi.fn() },
      now: () => new Date("2025-01-01T00:00:00.000Z"),
      openBlockService: { requestOpen: vi.fn() },
      persistence: { paths: { getAssetPathForBlock: vi.fn() } },
      preferencesService: { readAutoArchiveSettings: vi.fn() },
      windowManager: { requestQuit: vi.fn() },
    } as never;

    registerFeatureCommands(ipc, deps);

    expect(mocks.registerAssetsCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerBlocksCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerClipboardCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerCliCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerExternalEditCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerExternalUrlCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerOpenBlockCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerPreferencesCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerShortcutCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerTagsCommands).toHaveBeenCalledTimes(1);
    expect(mocks.registerWindowCommands).toHaveBeenCalledTimes(1);
    expect((ipc as { register: () => void }).register).toHaveBeenCalledTimes(1);
  });
});
