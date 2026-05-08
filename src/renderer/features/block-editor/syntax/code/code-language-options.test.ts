import { describe, expect, it } from "vite-plus/test";

import {
  CODE_LANGUAGE_OPTIONS,
  getCodeLanguageLabel,
  getCodeNodeLanguage,
  normalizeCodeBlockLanguage,
} from "./code-language-options";

describe("code language options", () => {
  it("normalizes missing languages to plain text", () => {
    expect(normalizeCodeBlockLanguage(null)).toBe("plain");
    expect(getCodeLanguageLabel(undefined)).toBe("Plain text");
  });

  it("normalizes common aliases to supported shiki languages", () => {
    expect(normalizeCodeBlockLanguage("js")).toBe("javascript");
    expect(normalizeCodeBlockLanguage("ts")).toBe("typescript");
    expect(normalizeCodeBlockLanguage("dockerfile")).toBe("docker");
    expect(normalizeCodeBlockLanguage("ps1")).toBe("powershell");
  });

  it("uses supported shiki languages for all language options", () => {
    for (const option of CODE_LANGUAGE_OPTIONS) {
      expect(normalizeCodeBlockLanguage(option.value)).toBe(option.value);
    }
  });

  it("maps language options to CodeNode languages", () => {
    expect(getCodeNodeLanguage({ label: "Plain text", value: "plain" })).toBe("plain");
    expect(getCodeNodeLanguage({ label: "TypeScript", value: "typescript" })).toBe("typescript");
  });
});
