import { describe, expect, it } from "vite-plus/test";

import { deriveScanIntervalSeconds } from "./auto-archive-runtime";

describe("deriveScanIntervalSeconds", () => {
  it("enforces the minimum interval for short idle durations", () => {
    expect(deriveScanIntervalSeconds(1)).toBe(30);
    expect(deriveScanIntervalSeconds(5)).toBe(30);
  });

  it("derives proportional intervals within bounds", () => {
    expect(deriveScanIntervalSeconds(30)).toBe(180);
    expect(deriveScanIntervalSeconds(90)).toBe(540);
  });

  it("enforces the maximum interval for long idle durations", () => {
    expect(deriveScanIntervalSeconds(10080)).toBe(900);
  });
});
