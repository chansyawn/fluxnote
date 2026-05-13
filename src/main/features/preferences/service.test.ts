import { DEFAULT_SETTINGS } from "@shared/features/preferences/settings";
import { describe, expect, it } from "vitest";

import { createPreferencesService } from "./service";

describe("preferences service", () => {
  it("reads default settings from storage", () => {
    const service = createPreferencesService({ store: DEFAULT_SETTINGS });

    expect(service.readSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("patches nested settings with normalization", () => {
    const service = createPreferencesService({ store: DEFAULT_SETTINGS });

    const result = service.patchSettings({
      appearance: { locale: "zh-Hans", fontSize: 20 },
      autoArchive: { enabled: false },
      markdown: { codeBlock: { wordWrap: true } },
    });

    expect(result.appearance.locale).toBe("zh-Hans");
    expect(result.appearance.fontSize).toBe(20);
    expect(result.autoArchive.enabled).toBe(false);
    expect(result.markdown.codeBlock).toEqual({
      showLineNumbers: false,
      wordWrap: true,
    });
    expect(service.readAutoArchiveSettings()).toEqual(result.autoArchive);
  });

  it("resets settings to defaults", () => {
    const service = createPreferencesService({
      store: {
        ...DEFAULT_SETTINGS,
        appearance: { ...DEFAULT_SETTINGS.appearance, locale: "zh-Hans" },
      },
    });

    service.resetSettings();

    expect(service.readSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
