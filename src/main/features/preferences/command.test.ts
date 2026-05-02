import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerPreferencesCommands } from "./command";

describe("preferences command", () => {
  const handlers = new Map<string, (input: any) => unknown>();
  const ipc = {
    command: vi.fn((name: string, handler: (input: any) => unknown) => handlers.set(name, handler)),
  };
  const preferencesService = {
    patchSettings: vi.fn(),
    readAutoArchiveSettings: vi.fn(),
    readSettings: vi.fn(),
    resetSettings: vi.fn(),
  };

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    Object.values(preferencesService).forEach((fn) => fn.mockReset());
  });

  it("dispatches patch/read/reset commands", () => {
    preferencesService.patchSettings.mockReturnValue({
      appearance: { locale: "en", fontSize: 16 },
    });
    preferencesService.readSettings.mockReturnValue({ schemaVersion: 1 });
    preferencesService.resetSettings.mockReturnValue({ schemaVersion: 1 });
    registerPreferencesCommands(ipc as never, { preferencesService } as never);

    const patchResult = handlers.get("preferences.patch")?.({ appearance: { locale: "en" } });
    const readResult = handlers.get("preferences.read")?.({});
    const resetResult = handlers.get("preferences.reset")?.({});

    expect(preferencesService.patchSettings).toHaveBeenCalled();
    expect(readResult).toEqual({ schemaVersion: 1 });
    expect(resetResult).toEqual({ schemaVersion: 1 });
    expect(patchResult).toEqual({ appearance: { locale: "en", fontSize: 16 } });
  });
});
