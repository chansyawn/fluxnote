import type { BlockEditorClipboardWriteData } from "@renderer/features/block-editor";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  copyAsset: vi.fn(),
  createAsset: vi.fn(),
  resolveAsset: vi.fn(),
  writeBlockEditorClipboard: vi.fn(),
}));

vi.mock("@renderer/clients", () => ({
  copyAsset: mocks.copyAsset,
  createAsset: mocks.createAsset,
  resolveAsset: mocks.resolveAsset,
  writeBlockEditorClipboard: mocks.writeBlockEditorClipboard,
}));

import { createBlockEditorRuntime } from "./block-editor-runtime";

const clipboardData: BlockEditorClipboardWriteData = {
  html: "<p>Text</p>",
  imageFileUrl: "file:///tmp/photo.png",
  nodes: [{ text: "Text", type: "text", version: 1 }],
  text: "Text",
};

function setNavigatorClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText } },
  });
}

describe("block editor runtime", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "navigator");
    mocks.copyAsset.mockReset();
    mocks.createAsset.mockReset();
    mocks.resolveAsset.mockReset();
    mocks.writeBlockEditorClipboard.mockReset();
  });

  it("closes over the current block id for asset writes", async () => {
    const runtime = createBlockEditorRuntime("target-block");
    const assets = [{ dataBase64: "AQID", fileName: "photo.png", mimeType: "image/png" }];
    mocks.createAsset.mockResolvedValue({ assets: [] });
    mocks.copyAsset.mockResolvedValue({ assets: [] });

    await runtime.assets.create({ assets });
    await runtime.assets.copy({
      assetUrls: ["assets://source/photo.png"],
      sourceBlockId: "source-block",
    });

    expect(mocks.createAsset).toHaveBeenCalledWith({
      assets,
      blockId: "target-block",
    });
    expect(mocks.copyAsset).toHaveBeenCalledWith({
      assetUrls: ["assets://source/photo.png"],
      sourceBlockId: "source-block",
      targetBlockId: "target-block",
    });
  });

  it("passes asset resolve requests through unchanged", async () => {
    const runtime = createBlockEditorRuntime("block-1");
    mocks.resolveAsset.mockResolvedValue({
      assets: [{ assetUrl: "assets://block-1/photo.png", fileUrl: "file:///tmp/photo.png" }],
    });

    await runtime.assets.resolve({ assetUrls: ["assets://block-1/photo.png"] });

    expect(mocks.resolveAsset).toHaveBeenCalledWith({
      assetUrls: ["assets://block-1/photo.png"],
    });
  });

  it("writes clipboard data with the closed-over source block id", async () => {
    const runtime = createBlockEditorRuntime("block-1");
    const writeText = vi.fn(async () => undefined);
    mocks.writeBlockEditorClipboard.mockResolvedValue(undefined);
    setNavigatorClipboard(writeText);

    await runtime.clipboard.write(clipboardData);

    expect(mocks.writeBlockEditorClipboard).toHaveBeenCalledWith({
      html: "<p>Text</p>",
      imageFileUrl: "file:///tmp/photo.png",
      payload: {
        nodes: clipboardData.nodes,
        sourceBlockId: "block-1",
      },
      text: "Text",
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to plain text clipboard writes when rich clipboard write fails", async () => {
    const runtime = createBlockEditorRuntime("block-1");
    const writeText = vi.fn(async () => undefined);
    mocks.writeBlockEditorClipboard.mockRejectedValue(new Error("unavailable"));
    setNavigatorClipboard(writeText);

    await runtime.clipboard.write(clipboardData);

    expect(writeText).toHaveBeenCalledWith("Text");
  });

  it("writes plain text through the browser clipboard runtime", async () => {
    const runtime = createBlockEditorRuntime("block-1");
    const writeText = vi.fn(async () => undefined);
    setNavigatorClipboard(writeText);

    await runtime.clipboard.writeText("const value = 1;");

    expect(writeText).toHaveBeenCalledWith("const value = 1;");
    expect(mocks.writeBlockEditorClipboard).not.toHaveBeenCalled();
  });
});
