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

  it("should normalize nested fields without dropping valid sibling fields", () => {
    const normalized = normalizeSettings({
      schemaVersion: 1,
      appearance: {
        locale: "invalid",
        fontSize: 18,
        unknown: true,
      },
      autoArchive: {
        enabled: false,
        idleMinutes: 0,
      },
      shortcuts: {
        "toggle-window": 1,
        "create-block": null,
        "keep-block": "Mod+K",
        "archive-block": "Mod+E",
        "delete-block": "Mod+Delete",
        "submit-external-edit": "Mod+Enter",
        "cancel-external-edit": "Mod+\\",
      },
      markdown: {
        codeBlock: {
          showLineNumbers: "bad",
          wordWrap: true,
          unknown: true,
        },
        unknown: true,
      },
      unknown: true,
    });

    expect(normalized.appearance).toEqual({
      locale: "en",
      fontSize: 18,
    });
    expect(normalized.autoArchive).toEqual({
      enabled: false,
      idleMinutes: DEFAULT_SETTINGS.autoArchive.idleMinutes,
    });
    expect(normalized.shortcuts).toEqual({
      "toggle-window": "Alt+N",
      "create-block": null,
      "keep-block": "Mod+K",
      "archive-block": "Mod+E",
      "delete-block": "Mod+Delete",
      "quick-create-block": "Ctrl+Alt+N",
      "submit-external-edit": "Mod+Enter",
      "cancel-external-edit": "Mod+\\",
    });
    expect(normalized.markdown).toEqual({
      codeBlock: {
        showLineNumbers: false,
        wordWrap: true,
      },
    });
    expect(normalized).not.toHaveProperty("unknown");
    expect(normalized.appearance).not.toHaveProperty("unknown");
    expect(normalized.markdown).not.toHaveProperty("unknown");
    expect(normalized.markdown.codeBlock).not.toHaveProperty("unknown");
  });

  it("should parse valid settings patch", () => {
    expect(
      normalizeSettingsPatch({
        appearance: { locale: "zh-Hans" },
        autoArchive: { enabled: false, idleMinutes: 300 },
        shortcuts: { "archive-block": "Mod+E" },
        markdown: { codeBlock: { showLineNumbers: true, wordWrap: true } },
      }),
    ).toEqual({
      appearance: { locale: "zh-Hans" },
      autoArchive: { enabled: false, idleMinutes: 300 },
      shortcuts: { "archive-block": "Mod+E" },
      markdown: { codeBlock: { showLineNumbers: true, wordWrap: true } },
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
        markdown: { codeBlock: { unknown: true } },
      }),
    ).toThrow();

    expect(() =>
      normalizeSettingsPatch({
        unknown: true,
      }),
    ).toThrow();
  });
});
