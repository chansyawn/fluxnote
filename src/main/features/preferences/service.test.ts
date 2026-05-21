import { DEFAULT_SETTINGS } from "@shared/features/preferences/settings";
import { describe, expect, it, vi } from "vite-plus/test";

import { createPreferencesService } from "./service";

describe("preferences service", () => {
  it("reads default settings from storage", () => {
    const service = createPreferencesService({ storage: { store: DEFAULT_SETTINGS } });

    expect(service.readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("repairs invalid stored settings when reading", () => {
    const storage = {
      store: {
        ...DEFAULT_SETTINGS,
        appearance: {
          locale: "invalid",
          theme: "invalid",
          fontSize: 20,
          unknown: true,
        },
        markdown: {
          codeBlock: {
            showLineNumbers: true,
            wordWrap: "invalid",
            unknown: true,
          },
        },
        unknown: true,
      },
    };
    const service = createPreferencesService({ storage });

    const settings = service.readSettings();

    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      appearance: {
        locale: "en",
        theme: "system",
        fontSize: 20,
      },
      markdown: {
        codeBlock: {
          showLineNumbers: true,
          wordWrap: false,
        },
      },
    });
    expect(storage.store).toEqual(settings);
  });

  it("keeps clean stored settings unchanged when reading", () => {
    const storage = {
      store: {
        ...DEFAULT_SETTINGS,
        appearance: { ...DEFAULT_SETTINGS.appearance, locale: "zh-Hans" },
      },
    };
    const originalStore = storage.store;
    const service = createPreferencesService({ storage });

    const settings = service.readSettings();

    expect(settings).toEqual(originalStore);
    expect(storage.store).toBe(originalStore);
  });

  it("patches nested settings with normalization", () => {
    const service = createPreferencesService({ storage: { store: DEFAULT_SETTINGS } });

    const result = service.patchSettings({
      appearance: { locale: "zh-Hans", theme: "dark", fontSize: 20 },
      autoArchive: { enabled: false },
      markdown: { codeBlock: { wordWrap: true } },
    });

    expect(result.appearance.locale).toBe("zh-Hans");
    expect(result.appearance.theme).toBe("dark");
    expect(result.appearance.fontSize).toBe(20);
    expect(result.autoArchive.enabled).toBe(false);
    expect(result.markdown.codeBlock).toEqual({
      showLineNumbers: false,
      wordWrap: true,
    });
  });

  it("repairs stored settings before applying patch", () => {
    const storage = {
      store: {
        ...DEFAULT_SETTINGS,
        appearance: { locale: "invalid", theme: "light", fontSize: 20 },
        markdown: { codeBlock: { showLineNumbers: true, wordWrap: "invalid" } },
      },
    };
    const service = createPreferencesService({ storage });

    const result = service.patchSettings({
      markdown: { codeBlock: { wordWrap: true } },
    });

    expect(result.appearance).toEqual({
      locale: "en",
      theme: "light",
      fontSize: 20,
    });
    expect(result.markdown.codeBlock).toEqual({
      showLineNumbers: true,
      wordWrap: true,
    });
    expect(storage.store).toEqual(result);
  });

  it("rejects invalid patches without writing settings", () => {
    const storage = { store: DEFAULT_SETTINGS };
    const service = createPreferencesService({ storage });

    expect(() =>
      service.patchSettings({
        appearance: { fontSize: 999 },
      } as never),
    ).toThrow();
    expect(storage.store).toBe(DEFAULT_SETTINGS);
  });

  it("resets settings to defaults", () => {
    const service = createPreferencesService({
      storage: {
        store: {
          ...DEFAULT_SETTINGS,
          appearance: { ...DEFAULT_SETTINGS.appearance, locale: "zh-Hans" },
        },
      },
    });

    service.resetSettings();

    expect(service.readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("emits changed event after patch and reset writes", () => {
    const emitEvent = vi.fn();
    const service = createPreferencesService({
      emitEvent,
      storage: { store: DEFAULT_SETTINGS },
    });

    const patched = service.patchSettings({ appearance: { locale: "zh-Hans" } });
    const reset = service.resetSettings();

    expect(emitEvent).toHaveBeenNthCalledWith(1, "preferences.changed", patched);
    expect(emitEvent).toHaveBeenNthCalledWith(2, "preferences.changed", reset);
  });
});
