import { describe, expect, it } from "vite-plus/test";

import {
  DEFAULT_SETTINGS,
  isFontSize,
  isLocaleCode,
  isThemePreference,
  normalizeSettings,
  normalizeSettingsPatch,
  THEME_PREFERENCE_OPTIONS,
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
        theme: "invalid",
        fontSize: 18,
        unknown: true,
      },
      autoArchive: {
        enabled: false,
        idleMinutes: 0,
      },
      shortcuts: {
        toggleWindow: 1,
        createBlock: null,
        keepBlock: "Mod+K",
        togglePinBlock: "Mod+T",
        archiveBlock: "Mod+E",
        deleteBlock: "Mod+Delete",
        submitExternalEdit: "Mod+Enter",
        cancelExternalEdit: "Mod+\\",
      },
      markdown: {
        codeBlock: {
          showLineNumbers: "bad",
          wordWrap: true,
          unknown: true,
        },
        unknown: true,
      },
      telemetry: {
        enabled: "bad",
        unknown: true,
      },
      unknown: true,
    });

    expect(normalized.appearance).toEqual({
      locale: "en",
      theme: "system",
      fontSize: 18,
    });
    expect(normalized.autoArchive).toEqual({
      enabled: false,
      idleMinutes: DEFAULT_SETTINGS.autoArchive.idleMinutes,
    });
    expect(normalized.shortcuts).toEqual({
      toggleWindow: "Alt+N",
      createBlock: null,
      copyBlock: "Mod+Shift+C",
      keepBlock: "Mod+K",
      togglePinBlock: "Mod+T",
      archiveBlock: "Mod+E",
      deleteBlock: "Mod+Delete",
      quickCreateBlock: "Ctrl+Alt+N",
      submitExternalEdit: "Mod+Enter",
      cancelExternalEdit: "Mod+\\",
    });
    expect(normalized.markdown).toEqual({
      codeBlock: {
        showLineNumbers: false,
        wordWrap: true,
      },
    });
    expect(normalized.telemetry).toEqual({ enabled: true });
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
        shortcuts: { archiveBlock: "Mod+E", copyBlock: "Mod+Shift+C" },
        markdown: { codeBlock: { showLineNumbers: true, wordWrap: true } },
        telemetry: { enabled: false },
      }),
    ).toEqual({
      appearance: { locale: "zh-Hans" },
      autoArchive: { enabled: false, idleMinutes: 300 },
      shortcuts: { archiveBlock: "Mod+E", copyBlock: "Mod+Shift+C" },
      markdown: { codeBlock: { showLineNumbers: true, wordWrap: true } },
      telemetry: { enabled: false },
    });
  });

  it("should validate theme preference values", () => {
    expect(THEME_PREFERENCE_OPTIONS).toEqual(["system", "light", "dark"]);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("amoled")).toBe(false);
    expect(normalizeSettingsPatch({ appearance: { theme: "dark" } })).toEqual({
      appearance: { theme: "dark" },
    });
    expect(() => normalizeSettingsPatch({ appearance: { theme: "amoled" } })).toThrow();
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

    expect(() =>
      normalizeSettingsPatch({
        telemetry: { unknown: true },
      }),
    ).toThrow();
  });
});
