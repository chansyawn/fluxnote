import { describe, expect, it, vi } from "vite-plus/test";

import type { BlockEditorCreateAssetRequest, BlockEditorRuntime } from "../core/types";
import { createImagePayloadsFromFiles, isSupportedImageMimeType } from "./image-files";

type CreateAssets = BlockEditorRuntime["assets"]["create"];

describe("image file helpers", () => {
  it("filters supported image mime types", () => {
    expect(isSupportedImageMimeType("image/png")).toBe(true);
    expect(isSupportedImageMimeType("image/jpeg")).toBe(true);
    expect(isSupportedImageMimeType("text/plain")).toBe(false);
  });

  it("creates image payloads by storing files as block assets", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const createAssets = vi.fn(async (input: BlockEditorCreateAssetRequest) => {
      expect(input).toEqual({
        assets: [
          {
            dataBase64: "AQID",
            fileName: "photo.png",
            mimeType: "image/png",
          },
        ],
      });

      return {
        assets: [
          {
            altText: "photo.png",
            assetUrl: "assets://block-1/photo.png",
          },
        ],
      };
    });

    const payloads = await createImagePayloadsFromFiles({
      createAssets,
      files: [file],
    });

    expect(createAssets).toHaveBeenCalledTimes(1);
    expect(payloads).toEqual([
      { alt: "photo.png", src: "assets://block-1/photo.png", title: null },
    ]);
  });

  it("creates multiple image payloads with one asset request", async () => {
    const first = new File([new Uint8Array([1])], "first.png", { type: "image/png" });
    const second = new File([new Uint8Array([2])], "second.png", { type: "image/png" });
    const createAssets: CreateAssets = vi.fn(async () => ({
      assets: [
        { altText: "first.png", assetUrl: "assets://block-1/first.png" },
        { altText: "second.png", assetUrl: "assets://block-1/second.png" },
      ],
    }));

    const payloads = await createImagePayloadsFromFiles({
      createAssets,
      files: [first, second],
    });

    expect(createAssets).toHaveBeenCalledTimes(1);
    expect(payloads).toEqual([
      { alt: "first.png", src: "assets://block-1/first.png", title: null },
      { alt: "second.png", src: "assets://block-1/second.png", title: null },
    ]);
  });
});
