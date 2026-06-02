import { describe, expect, it } from "vite-plus/test";

import { normalizeKnownValue } from "../src/index.ts";

describe("normalizeKnownValue", () => {
  it("returns a known value unchanged", () => {
    expect(normalizeKnownValue("darwin", ["darwin", "win32", "unsupported"], "unsupported")).toBe(
      "darwin",
    );
  });

  it("returns the fallback for unknown values", () => {
    expect(normalizeKnownValue("linux", ["darwin", "win32", "unsupported"], "unsupported")).toBe(
      "unsupported",
    );
  });
});
