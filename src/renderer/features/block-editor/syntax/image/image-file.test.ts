import type { CreateAssetRequest } from "@renderer/clients";
import { describe, expect, it, vi } from "vite-plus/test";

import { createImagePayloadFromFile, isSupportedImageMimeType } from "./image-file";

describe("image file helpers", () => {
  it("filters supported image mime types", () => {
    expect(isSupportedImageMimeType("image/png")).toBe(true);
    expect(isSupportedImageMimeType("image/jpeg")).toBe(true);
    expect(isSupportedImageMimeType("text/plain")).toBe(false);
  });

  it("creates image payloads by storing files as block assets", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const createAssetClient = vi.fn(async (input: CreateAssetRequest) => {
      expect(input).toEqual({
        blockId: "block-1",
        dataBase64: "AQID",
        fileName: "photo.png",
        mimeType: "image/png",
      });

      return {
        altText: "photo.png",
        assetUrl: "assets://block-1/photo.png",
      };
    });

    const payload = await createImagePayloadFromFile({
      blockId: "block-1",
      createAssetClient,
      file,
    });

    expect(createAssetClient).toHaveBeenCalledTimes(1);
    expect(payload).toEqual({
      alt: "photo.png",
      src: "assets://block-1/photo.png",
      title: null,
    });
  });
});
