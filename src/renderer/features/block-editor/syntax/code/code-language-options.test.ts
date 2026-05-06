import { describe, expect, it } from "vite-plus/test";

import { roundTripMarkdown } from "../../core/editor-state";
import {
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
  });

  it("maps language options to CodeNode languages", () => {
    expect(getCodeNodeLanguage({ label: "Plain text", value: "plain" })).toBe("plain");
    expect(getCodeNodeLanguage({ label: "TypeScript", value: "typescript" })).toBe("typescript");
  });

  it("does not export internal plain text language as a markdown fence language", () => {
    expect(roundTripMarkdown(["```plain", "text", "```"].join("\n"))).toBe(
      ["```", "text", "```", ""].join("\n"),
    );
  });
});
