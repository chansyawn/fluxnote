import {
  AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES,
  normalizeAutoArchiveIdleMinutes,
  toAutoArchiveDurationViewModel,
  toAutoArchiveIdleMinutes,
} from "@shared/features/preferences/auto-archive";
import { DEFAULT_SETTINGS, settingsPatchSchema } from "@shared/features/preferences/settings";
import { normalizeSettings } from "@shared/features/preferences/settings";
import { describe, expect, it } from "vite-plus/test";

describe("auto archive preferences", () => {
  it("converts custom duration inputs to idle minutes", () => {
    expect(toAutoArchiveIdleMinutes({ amount: 1, unit: "minutes" })).toBe(1);
    expect(toAutoArchiveIdleMinutes({ amount: 90, unit: "minutes" })).toBe(90);
    expect(toAutoArchiveIdleMinutes({ amount: 12, unit: "hours" })).toBe(720);
    expect(toAutoArchiveIdleMinutes({ amount: 7, unit: "days" })).toBe(10080);
    expect(toAutoArchiveIdleMinutes({ amount: 14, unit: "days" })).toBe(20160);
    expect(toAutoArchiveIdleMinutes({ amount: 15, unit: "days" })).toBeNull();
  });

  it("falls back to the default idle minutes for invalid persisted values", () => {
    for (const value of [0, -1, 1.5, "10080", 20161, null, undefined]) {
      expect(normalizeAutoArchiveIdleMinutes(value)).toBe(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES);
    }
  });

  it("normalizes settings with custom idle minutes", () => {
    expect(
      normalizeSettings({
        schemaVersion: 1,
        appearance: {
          locale: "en",
          fontSize: 16,
        },
        autoArchive: {
          enabled: true,
          idleMinutes: 90,
        },
        shortcuts: DEFAULT_SETTINGS.shortcuts,
      }).autoArchive.idleMinutes,
    ).toBe(90);

    expect(
      normalizeSettings({
        schemaVersion: 1,
        appearance: {
          locale: "en",
          fontSize: 16,
        },
        autoArchive: {
          enabled: true,
          idleMinutes: 0,
        },
        shortcuts: DEFAULT_SETTINGS.shortcuts,
      }).autoArchive.idleMinutes,
    ).toBe(AUTO_ARCHIVE_DEFAULT_IDLE_MINUTES);
  });

  it("resets old settings shapes to the default settings", () => {
    expect(
      normalizeSettings({
        locale: "zh-Hans",
        fontSize: 20,
      }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it("validates partial settings patches", () => {
    expect(
      settingsPatchSchema.parse({
        appearance: {
          locale: "zh-Hans",
        },
        shortcuts: {
          "create-block": null,
        },
      }),
    ).toEqual({
      appearance: {
        locale: "zh-Hans",
      },
      shortcuts: {
        "create-block": null,
      },
    });

    expect(() =>
      settingsPatchSchema.parse({
        appearance: {
          locale: "fr",
        },
      }),
    ).toThrow();
    expect(() =>
      settingsPatchSchema.parse({
        unknown: true,
      }),
    ).toThrow();
  });

  it("formats idle minutes for the most compact whole unit", () => {
    expect(toAutoArchiveDurationViewModel(10080)).toEqual({ amount: 7, unit: "days" });
    expect(toAutoArchiveDurationViewModel(720)).toEqual({ amount: 12, unit: "hours" });
    expect(toAutoArchiveDurationViewModel(90)).toEqual({ amount: 90, unit: "minutes" });
  });
});
