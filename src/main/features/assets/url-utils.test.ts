import { describe, expect, it } from "vitest";

import { extFromMimeType, sanitizeFileName, splitAssetUrl } from "./url-utils";

describe("assets url utils", () => {
  it("maps known mime types and falls back to bin", () => {
    expect(extFromMimeType("image/png")).toBe("png");
    expect(extFromMimeType("image/jpeg")).toBe("jpg");
    expect(extFromMimeType("application/octet-stream")).toBe("bin");
  });

  it("sanitizes invalid filename characters and keeps fallback", () => {
    expect(sanitizeFileName("hello world?.png")).toBe("hello_world_.png");
    expect(sanitizeFileName("////")).toBe("_");
  });

  it("splits valid asset url", () => {
    expect(splitAssetUrl("assets://block-1/path/to.png")).toEqual({
      blockId: "block-1",
      fileName: "path/to.png",
    });
  });

  it("throws business error for invalid asset url", () => {
    expect(() => splitAssetUrl("http://invalid")).toThrowError("Invalid asset url");
    expect(() => splitAssetUrl("assets://missing-block")).toThrowError("Invalid asset url");
  });
});
