import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

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
  const applyThemePreference = vi.fn();
  const onAutoArchivePreferencesChanged = vi.fn(async () => undefined);
  const onLocalePreferenceChanged = vi.fn();
  const onTelemetryPreferenceChanged = vi.fn();

  beforeEach(() => {
    handlers.clear();
    ipc.command.mockClear();
    applyThemePreference.mockClear();
    onAutoArchivePreferencesChanged.mockClear();
    onLocalePreferenceChanged.mockClear();
    onTelemetryPreferenceChanged.mockClear();
    Object.values(preferencesService).forEach((fn) => fn.mockReset());
  });

  it("dispatches patch/read/reset commands", async () => {
    preferencesService.patchSettings.mockReturnValue({
      appearance: { locale: "en", theme: "dark", fontSize: 16 },
    });
    preferencesService.readSettings.mockReturnValue({
      schemaVersion: 1,
      appearance: { theme: "light" },
    });
    preferencesService.resetSettings.mockReturnValue({
      schemaVersion: 1,
      appearance: { theme: "system" },
    });
    registerPreferencesCommands(
      ipc as never,
      {
        applyThemePreference,
        onAutoArchivePreferencesChanged,
        onLocalePreferenceChanged,
        onTelemetryPreferenceChanged,
        preferencesService,
      } as never,
    );

    const patchResult = await handlers.get("preferences.patch")?.({
      appearance: { locale: "en" },
    });
    const readResult = handlers.get("preferences.read")?.({});
    const resetResult = await handlers.get("preferences.reset")?.({});

    expect(preferencesService.patchSettings).toHaveBeenCalled();
    expect(readResult).toEqual({ schemaVersion: 1, appearance: { theme: "light" } });
    expect(resetResult).toEqual({ schemaVersion: 1, appearance: { theme: "system" } });
    expect(patchResult).toEqual({ appearance: { locale: "en", theme: "dark", fontSize: 16 } });
    expect(applyThemePreference).toHaveBeenNthCalledWith(1, "dark");
    expect(applyThemePreference).toHaveBeenNthCalledWith(2, "light");
    expect(applyThemePreference).toHaveBeenNthCalledWith(3, "system");
    expect(onAutoArchivePreferencesChanged).toHaveBeenCalledTimes(1);
    expect(onLocalePreferenceChanged).toHaveBeenCalledTimes(2);
    expect(onTelemetryPreferenceChanged).toHaveBeenCalledTimes(1);
  });

  it("notifies auto archive changes after auto archive patch", async () => {
    preferencesService.patchSettings.mockReturnValue({
      schemaVersion: 1,
      appearance: { theme: "system" },
    });
    registerPreferencesCommands(
      ipc as never,
      {
        applyThemePreference,
        onAutoArchivePreferencesChanged,
        onLocalePreferenceChanged,
        onTelemetryPreferenceChanged,
        preferencesService,
      } as never,
    );

    await handlers.get("preferences.patch")?.({ autoArchive: { enabled: false } });

    expect(onAutoArchivePreferencesChanged).toHaveBeenCalledTimes(1);
  });

  it("does not notify auto archive changes after theme patch", async () => {
    preferencesService.patchSettings.mockReturnValue({
      schemaVersion: 1,
      appearance: { theme: "dark" },
    });
    registerPreferencesCommands(
      ipc as never,
      {
        applyThemePreference,
        onAutoArchivePreferencesChanged,
        onLocalePreferenceChanged,
        onTelemetryPreferenceChanged,
        preferencesService,
      } as never,
    );

    await handlers.get("preferences.patch")?.({ appearance: { theme: "dark" } });

    expect(applyThemePreference).toHaveBeenCalledWith("dark");
    expect(onAutoArchivePreferencesChanged).not.toHaveBeenCalled();
    expect(onLocalePreferenceChanged).not.toHaveBeenCalled();
    expect(onTelemetryPreferenceChanged).not.toHaveBeenCalled();
  });

  it("notifies telemetry changes after telemetry patch", async () => {
    preferencesService.patchSettings.mockReturnValue({
      schemaVersion: 1,
      appearance: { theme: "system" },
    });
    registerPreferencesCommands(
      ipc as never,
      {
        applyThemePreference,
        onAutoArchivePreferencesChanged,
        onLocalePreferenceChanged,
        onTelemetryPreferenceChanged,
        preferencesService,
      } as never,
    );

    await handlers.get("preferences.patch")?.({ telemetry: { enabled: false } });

    expect(onTelemetryPreferenceChanged).toHaveBeenCalledTimes(1);
  });

  it("does not notify telemetry changes after non telemetry patch", async () => {
    preferencesService.patchSettings.mockReturnValue({
      schemaVersion: 1,
      appearance: { theme: "dark" },
    });
    registerPreferencesCommands(
      ipc as never,
      {
        applyThemePreference,
        onAutoArchivePreferencesChanged,
        onLocalePreferenceChanged,
        onTelemetryPreferenceChanged,
        preferencesService,
      } as never,
    );

    await handlers.get("preferences.patch")?.({ appearance: { theme: "dark" } });

    expect(onTelemetryPreferenceChanged).not.toHaveBeenCalled();
  });
});
