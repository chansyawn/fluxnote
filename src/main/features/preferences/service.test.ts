import {
  DEFAULT_SETTINGS,
  SETTINGS_SCHEMA_VERSION,
  type Settings,
} from "@shared/features/preferences/settings";
import { describe, expect, it } from "vite-plus/test";

import { createPreferencesService } from "./service";

function createStorage(initialStore: Record<string, unknown> = {}) {
  return {
    store: initialStore,
  };
}

describe("preferences service", () => {
  it("normalizes corrupt stored settings", () => {
    const storage = createStorage({ locale: "zh-Hans" });
    const service = createPreferencesService(storage);

    expect(service.readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("deep-merges settings patches without dropping unrelated fields", () => {
    const storage = createStorage({
      ...DEFAULT_SETTINGS,
      appearance: {
        ...DEFAULT_SETTINGS.appearance,
        locale: "zh-Hans",
      },
      shortcuts: {
        ...DEFAULT_SETTINGS.shortcuts,
        "create-block": null,
      },
    } satisfies Settings);
    const service = createPreferencesService(storage);

    const nextSettings = service.patchSettings({
      autoArchive: {
        enabled: false,
      },
      appearance: {
        fontSize: 20,
      },
    });

    expect(nextSettings).toEqual({
      ...DEFAULT_SETTINGS,
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      appearance: {
        locale: "zh-Hans",
        fontSize: 20,
      },
      autoArchive: {
        ...DEFAULT_SETTINGS.autoArchive,
        enabled: false,
      },
      shortcuts: {
        ...DEFAULT_SETTINGS.shortcuts,
        "create-block": null,
      },
    });
    expect(storage.store).toEqual(nextSettings);
  });

  it("resets settings to defaults", () => {
    const storage = createStorage({
      ...DEFAULT_SETTINGS,
      appearance: {
        locale: "zh-Hans",
        fontSize: 20,
      },
    });
    const service = createPreferencesService(storage);

    expect(service.resetSettings()).toEqual(DEFAULT_SETTINGS);
    expect(storage.store).toEqual(DEFAULT_SETTINGS);
  });

  it("returns normalized auto archive settings", () => {
    const storage = createStorage({
      ...DEFAULT_SETTINGS,
      autoArchive: {
        enabled: false,
        idleMinutes: 90,
      },
    });
    const service = createPreferencesService(storage);

    expect(service.readAutoArchiveSettings()).toEqual({
      enabled: false,
      idleMinutes: 90,
    });
  });
});
