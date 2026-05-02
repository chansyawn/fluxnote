import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  isFontSize,
  isLocaleCode,
  normalizeSettings,
  normalizeSettingsPatch,
} from "./settings";

describe("settings", () => {
  it("should validate locale code", () => {
    expect(isLocaleCode("en")).toBe(true);
    expect(isLocaleCode("zh-Hans")).toBe(true);
    expect(isLocaleCode("fr")).toBe(false);
  });

  it("should validate font size", () => {
    expect(isFontSize(16)).toBe(true);
    expect(isFontSize(15)).toBe(false);
  });

  it("should fallback to default settings for invalid input", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ schemaVersion: 999 })).toEqual(DEFAULT_SETTINGS);
  });

  it("should normalize nested fields with catch defaults", () => {
    const normalized = normalizeSettings({
      schemaVersion: 1,
      appearance: {
        locale: "invalid",
        fontSize: 999,
      },
      autoArchive: {
        enabled: "bad",
        idleMinutes: 0,
      },
      shortcuts: {
        "toggle-window": 1,
        "create-block": null,
        "delete-block": "Mod+Delete",
      },
    });

    expect(normalized.appearance).toEqual(DEFAULT_SETTINGS.appearance);
    expect(normalized.autoArchive).toEqual(DEFAULT_SETTINGS.autoArchive);
    expect(normalized.shortcuts).toEqual({
      "toggle-window": "Alt+N",
      "create-block": null,
      "delete-block": "Mod+Delete",
    });
  });

  it("should parse valid settings patch", () => {
    expect(
      normalizeSettingsPatch({
        appearance: { locale: "zh-Hans" },
        autoArchive: { enabled: false, idleMinutes: 300 },
      }),
    ).toEqual({
      appearance: { locale: "zh-Hans" },
      autoArchive: { enabled: false, idleMinutes: 300 },
    });
  });

  it("should reject settings patch with extra fields", () => {
    expect(() =>
      normalizeSettingsPatch({
        appearance: { locale: "en", unknown: true },
      }),
    ).toThrow();

    expect(() =>
      normalizeSettingsPatch({
        unknown: true,
      }),
    ).toThrow();
  });
});
