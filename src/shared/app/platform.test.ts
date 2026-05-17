import { describe, expect, it } from "vite-plus/test";

import { normalizeAppPlatform } from "./platform";

describe("normalizeAppPlatform", () => {
  it("returns supported app platforms unchanged", () => {
    expect(normalizeAppPlatform("darwin")).toBe("darwin");
    expect(normalizeAppPlatform("win32")).toBe("win32");
  });

  it("maps unsupported platforms to unsupported", () => {
    expect(normalizeAppPlatform("linux")).toBe("unsupported");
    expect(normalizeAppPlatform("freebsd")).toBe("unsupported");
    expect(normalizeAppPlatform("")).toBe("unsupported");
  });
});
