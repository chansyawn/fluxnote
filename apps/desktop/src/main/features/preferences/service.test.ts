import {
  createDefaultUserPreferences,
  DEFAULT_USER_PREFERENCES,
} from "@shared/features/preferences/user-preferences";
import { describe, expect, it, vi } from "vite-plus/test";

import { createPreferencesService } from "./service";

describe("preferences service", () => {
  it("reads default preferences from storage", () => {
    const service = createPreferencesService({ storage: { store: DEFAULT_USER_PREFERENCES } });

    expect(service.readUserPreferences()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it("reads runtime default preferences from storage", () => {
    const defaults = createDefaultUserPreferences("zh-Hans");
    const service = createPreferencesService({ defaults, storage: { store: defaults } });

    expect(service.readUserPreferences()).toEqual(defaults);
  });

  it("repairs invalid stored preferences when reading", () => {
    const storage = {
      store: {
        ...DEFAULT_USER_PREFERENCES,
        appearance: {
          locale: "invalid",
          theme: "invalid",
          fontSize: 20,
          unknown: true,
        },
        markdown: {
          codeBlock: {
            showLineNumbers: true,
            unknown: true,
          },
        },
        telemetry: {
          enabled: "invalid",
          unknown: true,
        },
        appUpdate: {
          automaticChecksEnabled: "invalid",
          unknown: true,
        },
        unknown: true,
      },
    };
    const service = createPreferencesService({ storage });

    const preferences = service.readUserPreferences();

    expect(preferences).toEqual({
      ...DEFAULT_USER_PREFERENCES,
      appearance: {
        locale: "en",
        theme: "system",
        fontSize: 20,
      },
      markdown: {
        codeBlock: {
          showLineNumbers: true,
        },
      },
      telemetry: {
        enabled: true,
      },
      appUpdate: {
        automaticChecksEnabled: true,
      },
    });
    expect(storage.store).toEqual(preferences);
  });

  it("repairs invalid stored locale to runtime default locale", () => {
    const defaults = createDefaultUserPreferences("zh-Hans");
    const storage = {
      store: {
        ...DEFAULT_USER_PREFERENCES,
        appearance: {
          locale: "invalid",
          theme: "light",
          fontSize: 20,
        },
      },
    };
    const service = createPreferencesService({ defaults, storage });

    const preferences = service.readUserPreferences();

    expect(preferences.appearance).toEqual({
      locale: "zh-Hans",
      theme: "light",
      fontSize: 20,
    });
    expect(storage.store).toEqual(preferences);
  });

  it("keeps clean stored preferences unchanged when reading", () => {
    const storage = {
      store: {
        ...DEFAULT_USER_PREFERENCES,
        appearance: { ...DEFAULT_USER_PREFERENCES.appearance, locale: "zh-Hans" },
      },
    };
    const originalStore = storage.store;
    const service = createPreferencesService({ storage });

    const preferences = service.readUserPreferences();

    expect(preferences).toEqual(originalStore);
    expect(storage.store).toBe(originalStore);
  });

  it("patches nested preferences with normalization", () => {
    const service = createPreferencesService({ storage: { store: DEFAULT_USER_PREFERENCES } });

    const result = service.patchUserPreferences({
      appearance: { locale: "zh-Hans", theme: "dark", fontSize: 20 },
      autoArchive: { enabled: false },
      appUpdate: { automaticChecksEnabled: false },
      externalEdit: { hideAfterSubmit: false },
      markdown: { codeBlock: { showLineNumbers: true } },
      telemetry: { enabled: false },
    });

    expect(result.appearance.locale).toBe("zh-Hans");
    expect(result.appearance.theme).toBe("dark");
    expect(result.appearance.fontSize).toBe(20);
    expect(result.autoArchive.enabled).toBe(false);
    expect(result.appUpdate.automaticChecksEnabled).toBe(false);
    expect(result.externalEdit.hideAfterSubmit).toBe(false);
    expect(result.markdown.codeBlock).toEqual({
      showLineNumbers: true,
    });
    expect(result.telemetry.enabled).toBe(false);
  });

  it("repairs stored preferences before applying patch", () => {
    const storage = {
      store: {
        ...DEFAULT_USER_PREFERENCES,
        appearance: { locale: "invalid", theme: "light", fontSize: 20 },
        markdown: { codeBlock: { showLineNumbers: true } },
      },
    };
    const service = createPreferencesService({ storage });

    const result = service.patchUserPreferences({
      markdown: { codeBlock: { showLineNumbers: false } },
    });

    expect(result.appearance).toEqual({
      locale: "en",
      theme: "light",
      fontSize: 20,
    });
    expect(result.markdown.codeBlock).toEqual({
      showLineNumbers: false,
    });
    expect(storage.store).toEqual(result);
  });

  it("repairs stored preferences with runtime defaults before applying patch", () => {
    const defaults = createDefaultUserPreferences("zh-Hans");
    const storage = {
      store: {
        ...DEFAULT_USER_PREFERENCES,
        appearance: { locale: "invalid", theme: "light", fontSize: 20 },
        markdown: { codeBlock: { showLineNumbers: true } },
      },
    };
    const service = createPreferencesService({ defaults, storage });

    const result = service.patchUserPreferences({
      markdown: { codeBlock: { showLineNumbers: false } },
    });

    expect(result.appearance).toEqual({
      locale: "zh-Hans",
      theme: "light",
      fontSize: 20,
    });
    expect(result.markdown.codeBlock).toEqual({
      showLineNumbers: false,
    });
    expect(storage.store).toEqual(result);
  });

  it("rejects invalid patches without writing preferences", () => {
    const storage = { store: DEFAULT_USER_PREFERENCES };
    const service = createPreferencesService({ storage });

    expect(() =>
      service.patchUserPreferences({
        appearance: { fontSize: 999 },
      } as never),
    ).toThrow();
    expect(storage.store).toBe(DEFAULT_USER_PREFERENCES);
  });

  it("resets preferences to defaults", () => {
    const service = createPreferencesService({
      storage: {
        store: {
          ...DEFAULT_USER_PREFERENCES,
          appearance: { ...DEFAULT_USER_PREFERENCES.appearance, locale: "zh-Hans" },
        },
      },
    });

    service.resetUserPreferences();

    expect(service.readUserPreferences()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it("resets preferences to runtime defaults", () => {
    const defaults = createDefaultUserPreferences("zh-Hans");
    const service = createPreferencesService({
      defaults,
      storage: {
        store: {
          ...DEFAULT_USER_PREFERENCES,
          appearance: { ...DEFAULT_USER_PREFERENCES.appearance, locale: "en" },
        },
      },
    });

    service.resetUserPreferences();

    expect(service.readUserPreferences()).toEqual(defaults);
  });

  it("emits changed event after patch and reset writes", () => {
    const emitEvent = vi.fn();
    const service = createPreferencesService({
      emitEvent,
      storage: { store: DEFAULT_USER_PREFERENCES },
    });

    const patched = service.patchUserPreferences({ appearance: { locale: "zh-Hans" } });
    const reset = service.resetUserPreferences();

    expect(emitEvent).toHaveBeenNthCalledWith(1, "preferences.changed", patched);
    expect(emitEvent).toHaveBeenNthCalledWith(2, "preferences.changed", reset);
  });
});
