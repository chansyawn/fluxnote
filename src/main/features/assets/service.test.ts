import { describe, expect, it, vi } from "vitest";

import { createBlockRecord } from "../blocks/service";
import { createTestDb } from "../test-db";
import { copyAsset, createAsset } from "./service";

describe("assets service", () => {
  const paths = {
    getAssetPathForBlock: (id: string) => `/tmp/${id}`,
    getAssetsRootPath: () => "/tmp",
    getDatabasePath: () => "/tmp/test.sqlite3",
  };

  it("creates asset and writes decoded bytes", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const writeFile = vi.fn(async () => undefined);

      const result = await createAsset(
        {
          paths,
          storage: { copyFile: vi.fn(), writeFile },
        },
        ctx.db,
        {
          blockId: block.id,
          dataBase64: Buffer.from("hello").toString("base64"),
          fileName: " hello world.png ",
          mimeType: "image/png",
        },
      );

      expect(result.assetUrl.startsWith(`assets://${block.id}/`)).toBe(true);
      expect(result.altText).toBe(" hello world.png ");
      expect(writeFile).toHaveBeenCalledTimes(1);
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("creates unique asset urls for repeated original file names", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const writeFile = vi.fn(async (_filePath: string, _data: Buffer) => undefined);
      const storage = { copyFile: vi.fn(), writeFile };

      const first = await createAsset(
        {
          paths,
          storage,
        },
        ctx.db,
        {
          blockId: block.id,
          dataBase64: Buffer.from("first").toString("base64"),
          fileName: "image.png",
          mimeType: "image/png",
        },
      );
      const second = await createAsset(
        {
          paths,
          storage,
        },
        ctx.db,
        {
          blockId: block.id,
          dataBase64: Buffer.from("second").toString("base64"),
          fileName: "image.png",
          mimeType: "image/png",
        },
      );

      const firstPath = writeFile.mock.calls[0]?.[0];
      const secondPath = writeFile.mock.calls[1]?.[0];

      expect(first.assetUrl).not.toBe(second.assetUrl);
      expect(first.altText).toBe("image.png");
      expect(second.altText).toBe("image.png");
      expect(firstPath).not.toBe(secondPath);
      expect(first.assetUrl).toContain("image.png");
      expect(second.assetUrl).toContain("image.png");
      expect(writeFile).toHaveBeenCalledTimes(2);
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("copies asset for target block", async () => {
    const ctx = await createTestDb();
    try {
      const source = await createBlockRecord(ctx.db, "source");
      const target = await createBlockRecord(ctx.db, "target");
      const copyFile = vi.fn(async () => undefined);

      const result = await copyAsset(
        {
          paths,
          storage: { copyFile, writeFile: vi.fn() },
        },
        ctx.db,
        {
          assetUrl: `assets://${source.id}/a.png`,
          sourceBlockId: source.id,
          targetBlockId: target.id,
        },
      );

      expect(result.assetUrl.startsWith(`assets://${target.id}/`)).toBe(true);
      expect(copyFile).toHaveBeenCalledTimes(1);
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("throws business error when asset source block mismatches", async () => {
    const ctx = await createTestDb();
    try {
      const source = await createBlockRecord(ctx.db, "source");
      const target = await createBlockRecord(ctx.db, "target");

      await expect(
        copyAsset(
          {
            paths,
            storage: { copyFile: vi.fn(), writeFile: vi.fn() },
          },
          ctx.db,
          {
            assetUrl: `assets://another/file.png`,
            sourceBlockId: source.id,
            targetBlockId: target.id,
          },
        ),
      ).rejects.toMatchObject({ code: "BUSINESS.INVALID_OPERATION" });
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });
});
