import { describe, expect, it } from "vite-plus/test";

import { CODE_LANGUAGE_OPTIONS, filterCodeLanguageOptions } from "./code-language-options";

function labelsFor(searchValue: string): string[] {
  return filterCodeLanguageOptions(searchValue).map((option) => option.label);
}

describe("code language options", () => {
  describe("filterCodeLanguageOptions", () => {
    it("returns all options for blank search", () => {
      expect(filterCodeLanguageOptions("   ")).toEqual(CODE_LANGUAGE_OPTIONS);
    });

    it("matches language labels and values", () => {
      expect(labelsFor("tsx")).toEqual(["TSX"]);
      expect(labelsFor("docker")).toEqual(["Dockerfile"]);
    });

    it("matches Shiki language aliases", () => {
      expect(labelsFor("js")).toEqual(expect.arrayContaining(["JavaScript", "JSX"]));
      expect(labelsFor("ts")).toEqual(expect.arrayContaining(["TypeScript", "TSX"]));
      expect(labelsFor("py")).toEqual(["Python"]);
      expect(labelsFor("bash")).toEqual(["Shell"]);
      expect(labelsFor("md")).toEqual(["Markdown"]);
      expect(labelsFor("yml")).toEqual(["YAML"]);
      expect(labelsFor("objc")).toEqual(["Objective-C"]);
    });

    it("keeps text matches when an alias also matches another language", () => {
      expect(labelsFor("cs")).toEqual(expect.arrayContaining(["CSS", "C#"]));
      expect(labelsFor("sh")).toEqual(expect.arrayContaining(["Shell", "PowerShell"]));
    });

    it("returns no options for unknown search", () => {
      expect(labelsFor("not-a-language")).toEqual([]);
    });
  });
});
