import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerPreferencesCommands } from "./command";

describe("preferences command", () => {
  const handlers = new Map<string, (input: any) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: any) => unknown) => handlers.set(name, handler)),
  };
  const preferencesService = {
    patchSettings: vi.fn(),
    readSettings: vi.fn(),
    resetSettings: vi.fn(),
  };
  const onAutoArchivePreferencesChanged = vi.fn(async () => undefined);

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    onAutoArchivePreferencesChanged.mockClear();
    Object.values(preferencesService).forEach((fn) => fn.mockReset());
  });

  it("dispatches patch/read/reset commands", async () => {
    preferencesService.patchSettings.mockReturnValue({
      appearance: { locale: "en", fontSize: 16 },
    });
    preferencesService.readSettings.mockReturnValue({ schemaVersion: 1 });
    preferencesService.resetSettings.mockReturnValue({ schemaVersion: 1 });
    registerPreferencesCommands(
      ipc as never,
      {
        onAutoArchivePreferencesChanged,
        preferencesService,
      } as never,
    );

    const patchResult = await handlers.get("preferences.patch")?.({
      appearance: { locale: "en" },
    });
    const readResult = handlers.get("preferences.read")?.({});
    const resetResult = await handlers.get("preferences.reset")?.({});

    expect(preferencesService.patchSettings).toHaveBeenCalled();
    expect(readResult).toEqual({ schemaVersion: 1 });
    expect(resetResult).toEqual({ schemaVersion: 1 });
    expect(patchResult).toEqual({ appearance: { locale: "en", fontSize: 16 } });
    expect(onAutoArchivePreferencesChanged).toHaveBeenCalledTimes(1);
  });

  it("notifies auto archive changes after auto archive patch", async () => {
    preferencesService.patchSettings.mockReturnValue({ schemaVersion: 1 });
    registerPreferencesCommands(
      ipc as never,
      {
        onAutoArchivePreferencesChanged,
        preferencesService,
      } as never,
    );

    await handlers.get("preferences.patch")?.({ autoArchive: { enabled: false } });

    expect(onAutoArchivePreferencesChanged).toHaveBeenCalledTimes(1);
  });
});
