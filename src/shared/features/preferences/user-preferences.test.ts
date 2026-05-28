import { describe, expect, it } from "vite-plus/test";

import {
  createDefaultUserPreferences,
  DEFAULT_USER_PREFERENCES,
  isFontSize,
  isLocaleCode,
  isThemePreference,
  normalizeUserPreferences,
  normalizeUserPreferencesPatch,
  resolvePreferredLocale,
  THEME_PREFERENCE_OPTIONS,
} from "./user-preferences";

describe("preferences", () => {
  it("should validate locale code", () => {
    expect(isLocaleCode("en")).toBe(true);
    expect(isLocaleCode("zh-Hans")).toBe(true);
    expect(isLocaleCode("fr")).toBe(false);
  });

  it("should validate font size", () => {
    expect(isFontSize(16)).toBe(true);
    expect(isFontSize(15)).toBe(false);
  });

  it("should fallback to default preferences for invalid input", () => {
    expect(normalizeUserPreferences(null)).toEqual(DEFAULT_USER_PREFERENCES);
    expect(normalizeUserPreferences({})).toEqual(DEFAULT_USER_PREFERENCES);
    expect(normalizeUserPreferences({ schemaVersion: 999 })).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it("should fallback to runtime defaults for invalid input", () => {
    const defaults = createDefaultUserPreferences("zh-Hans");

    expect(normalizeUserPreferences(null, defaults)).toEqual(defaults);
    expect(normalizeUserPreferences({ schemaVersion: 999 }, defaults)).toEqual(defaults);
  });

  it("should normalize nested fields without dropping valid sibling fields", () => {
    const normalized = normalizeUserPreferences({
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
        "global.toggleWindow": 1,
        "workspace.createBlock": null,
        "workspace.keepBlock": "Mod+K",
        "workspace.togglePinBlock": "Mod+T",
        "workspace.archiveBlock": "Mod+E",
        "workspace.deleteBlock": "Mod+Delete",
        "workspace.submitExternalEdit": "Mod+Enter",
        "workspace.cancelExternalEdit": "Mod+\\",
      },
      markdown: {
        codeBlock: {
          showLineNumbers: "bad",
          unknown: true,
        },
        unknown: true,
      },
      telemetry: {
        enabled: "bad",
        unknown: true,
      },
      appUpdate: {
        automaticChecksEnabled: "bad",
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
      idleMinutes: DEFAULT_USER_PREFERENCES.autoArchive.idleMinutes,
    });
    expect(normalized.shortcuts).toEqual({
      "global.toggleWindow": "Alt+N",
      "global.quickCreateBlock": "Ctrl+Alt+N",
      "workspace.createBlock": null,
      "workspace.copyBlock": "Mod+Shift+C",
      "workspace.keepBlock": "Mod+K",
      "workspace.togglePinBlock": "Mod+T",
      "workspace.archiveBlock": "Mod+E",
      "workspace.deleteBlock": "Mod+Delete",
      "workspace.submitExternalEdit": "Mod+Enter",
      "workspace.cancelExternalEdit": "Mod+\\",
      "editor.formatBold": "Mod+B",
      "editor.formatItalic": "Mod+I",
      "editor.formatStrikethrough": "Mod+Shift+X",
      "editor.formatInlineCode": "Mod+Shift+E",
    });
    expect(normalized.markdown).toEqual({
      codeBlock: {
        showLineNumbers: false,
      },
    });
    expect(normalized.telemetry).toEqual({ enabled: true });
    expect(normalized.appUpdate).toEqual({ automaticChecksEnabled: true });
    expect(normalized).not.toHaveProperty("unknown");
    expect(normalized.appearance).not.toHaveProperty("unknown");
    expect(normalized.markdown).not.toHaveProperty("unknown");
    expect(normalized.markdown.codeBlock).not.toHaveProperty("unknown");
  });

  it("should parse valid preferences patch", () => {
    expect(
      normalizeUserPreferencesPatch({
        appearance: { locale: "zh-Hans" },
        autoArchive: { enabled: false, idleMinutes: 300 },
        shortcuts: {
          "workspace.archiveBlock": "Mod+E",
          "workspace.copyBlock": "Mod+Shift+C",
          "editor.formatInlineCode": "Mod+Shift+E",
        },
        markdown: { codeBlock: { showLineNumbers: true } },
        telemetry: { enabled: false },
        appUpdate: { automaticChecksEnabled: false },
      }),
    ).toEqual({
      appearance: { locale: "zh-Hans" },
      autoArchive: { enabled: false, idleMinutes: 300 },
      shortcuts: {
        "workspace.archiveBlock": "Mod+E",
        "workspace.copyBlock": "Mod+Shift+C",
        "editor.formatInlineCode": "Mod+Shift+E",
      },
      markdown: { codeBlock: { showLineNumbers: true } },
      telemetry: { enabled: false },
      appUpdate: { automaticChecksEnabled: false },
    });
  });

  it("should validate theme preference values", () => {
    expect(THEME_PREFERENCE_OPTIONS).toEqual(["system", "light", "dark"]);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("amoled")).toBe(false);
    expect(normalizeUserPreferencesPatch({ appearance: { theme: "dark" } })).toEqual({
      appearance: { theme: "dark" },
    });
    expect(() => normalizeUserPreferencesPatch({ appearance: { theme: "amoled" } })).toThrow();
  });

  it("should resolve preferred locale from supported language families", () => {
    expect(resolvePreferredLocale(["zh-CN"])).toBe("zh-Hans");
    expect(resolvePreferredLocale(["zh_Hans_CN"])).toBe("zh-Hans");
    expect(resolvePreferredLocale(["zh"])).toBe("zh-Hans");
    expect(resolvePreferredLocale(["en-US"])).toBe("en");
    expect(resolvePreferredLocale(["en"])).toBe("en");
    expect(resolvePreferredLocale(["fr-FR", "zh-CN"])).toBe("zh-Hans");
    expect(resolvePreferredLocale(["fr-FR", "en-GB"])).toBe("en");
    expect(resolvePreferredLocale([])).toBe("en");
    expect(resolvePreferredLocale(["", "fr-FR"])).toBe("en");
  });

  it("should create default preferences with runtime locale", () => {
    expect(createDefaultUserPreferences("zh-Hans")).toEqual({
      ...DEFAULT_USER_PREFERENCES,
      appearance: {
        ...DEFAULT_USER_PREFERENCES.appearance,
        locale: "zh-Hans",
      },
    });
  });

  it("should reject preferences patch with extra fields", () => {
    expect(() =>
      normalizeUserPreferencesPatch({
        appearance: { locale: "en", unknown: true },
      }),
    ).toThrow();

    expect(() =>
      normalizeUserPreferencesPatch({
        markdown: { codeBlock: { unknown: true } },
      }),
    ).toThrow();

    expect(() =>
      normalizeUserPreferencesPatch({
        unknown: true,
      }),
    ).toThrow();

    expect(() =>
      normalizeUserPreferencesPatch({
        telemetry: { unknown: true },
      }),
    ).toThrow();

    expect(() =>
      normalizeUserPreferencesPatch({
        appUpdate: { unknown: true },
      }),
    ).toThrow();
  });
});
