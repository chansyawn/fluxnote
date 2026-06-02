import { describe, expect, it, vi } from "vite-plus/test";

import { createBlockRecord } from "../blocks/service";
import { createTestDb } from "../test-db";
import {
  copyAsset,
  createAsset,
  externalizeMarkdownAssetUrls,
  importFileAssets,
  resolveAsset,
} from "./service";

describe("assets service", () => {
  const paths = {
    assetPathForBlock: (id: string) => `/tmp/${id}`,
    assetsRootPath: "/tmp",
    databasePath: "/tmp/test.sqlite3",
    userDataPath: "/tmp",
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
          assets: [
            {
              dataBase64: Buffer.from("hello").toString("base64"),
              fileName: " hello world.png ",
              mimeType: "image/png",
            },
          ],
          blockId: block.id,
        },
      );

      expect(result.assets[0]?.assetUrl.startsWith(`assets://${block.id}/`)).toBe(true);
      expect(result.assets[0]?.altText).toBe(" hello world.png ");
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

      const result = await createAsset(
        {
          paths,
          storage,
        },
        ctx.db,
        {
          assets: [
            {
              dataBase64: Buffer.from("first").toString("base64"),
              fileName: "image.png",
              mimeType: "image/png",
            },
            {
              dataBase64: Buffer.from("second").toString("base64"),
              fileName: "image.png",
              mimeType: "image/png",
            },
          ],
          blockId: block.id,
        },
      );

      const [first, second] = result.assets;
      const firstPath = writeFile.mock.calls[0]?.[0];
      const secondPath = writeFile.mock.calls[1]?.[0];

      expect(first?.assetUrl).not.toBe(second?.assetUrl);
      expect(first?.altText).toBe("image.png");
      expect(second?.altText).toBe("image.png");
      expect(firstPath).not.toBe(secondPath);
      expect(first?.assetUrl).toContain("image.png");
      expect(second?.assetUrl).toContain("image.png");
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
          assetUrls: [`assets://${source.id}/a.png`, `assets://${source.id}/b.png`],
          sourceBlockId: source.id,
          targetBlockId: target.id,
        },
      );

      expect(result.assets).toEqual([
        expect.objectContaining({
          assetUrl: expect.stringContaining(`assets://${target.id}/`),
          sourceAssetUrl: `assets://${source.id}/a.png`,
        }),
        expect.objectContaining({
          assetUrl: expect.stringContaining(`assets://${target.id}/`),
          sourceAssetUrl: `assets://${source.id}/b.png`,
        }),
      ]);
      expect(copyFile).toHaveBeenCalledTimes(2);
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
            assetUrls: [`assets://another/file.png`],
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

  it("imports supported file image urls into the target block assets", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const copyFile = vi.fn(async () => undefined);

      const result = await importFileAssets(
        {
          paths,
          storage: { copyFile, writeFile: vi.fn() },
        },
        ctx.db,
        {
          blockId: block.id,
          files: [{ fileUrl: "file:///Users/me/Pictures/Photo.PNG" }],
        },
      );

      expect(result.assets).toEqual([
        expect.objectContaining({
          altText: "Photo.PNG",
          assetUrl: expect.stringContaining(`assets://${block.id}/`),
          fileUrl: "file:///Users/me/Pictures/Photo.PNG",
        }),
      ]);
      expect(result.assets[0]?.assetUrl).toContain("Photo.PNG");
      expect(copyFile).toHaveBeenCalledWith(
        "/Users/me/Pictures/Photo.PNG",
        expect.stringContaining(`/tmp/${block.id}/`),
      );
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("returns per-file errors for unsupported file image imports", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const copyFile = vi.fn(async () => undefined);

      const result = await importFileAssets(
        {
          paths,
          storage: { copyFile, writeFile: vi.fn() },
        },
        ctx.db,
        {
          blockId: block.id,
          files: [{ fileUrl: "file:///tmp/document.pdf" }],
        },
      );

      expect(result.assets).toEqual([
        {
          error: "UNSUPPORTED_IMAGE_TYPE",
          fileUrl: "file:///tmp/document.pdf",
        },
      ]);
      expect(copyFile).not.toHaveBeenCalled();
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("keeps importing later file images when one copy fails", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const copyFile = vi
        .fn()
        .mockRejectedValueOnce(new Error("missing"))
        .mockResolvedValueOnce(undefined);

      const result = await importFileAssets(
        {
          paths,
          storage: { copyFile, writeFile: vi.fn() },
        },
        ctx.db,
        {
          blockId: block.id,
          files: [{ fileUrl: "file:///tmp/missing.png" }, { fileUrl: "file:///tmp/ok.webp" }],
        },
      );

      expect(result.assets).toEqual([
        {
          error: "IMPORT_FAILED",
          fileUrl: "file:///tmp/missing.png",
        },
        expect.objectContaining({
          altText: "ok.webp",
          assetUrl: expect.stringContaining(`assets://${block.id}/`),
          fileUrl: "file:///tmp/ok.webp",
        }),
      ]);
      expect(copyFile).toHaveBeenCalledTimes(2);
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("resolves asset urls to file urls", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");

      const result = await resolveAsset({ paths }, ctx.db, {
        assetUrls: [`assets://${block.id}/image.png`],
      });

      expect(result.assets).toEqual([
        {
          assetUrl: `assets://${block.id}/image.png`,
          fileUrl: `file:///tmp/${block.id}/image.png`,
        },
      ]);
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("externalizes markdown image asset urls without changing literal text", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const content = [
        `Literal assets://${block.id}/photo.png`,
        "",
        `![Alt](assets://${block.id}/photo.png)`,
        "",
        "![Remote](https://example.com/remote.png)",
      ].join("\n");

      const result = await externalizeMarkdownAssetUrls({ paths }, ctx.db, content);

      expect(result).toBe(
        [
          `Literal assets://${block.id}/photo.png`,
          "",
          `![Alt](file:///tmp/${block.id}/photo.png)`,
          "",
          "![Remote](https://example.com/remote.png)",
        ].join("\n"),
      );
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("externalizes repeated markdown image asset urls", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const content = [
        `![One](assets://${block.id}/photo.png)`,
        `![Two](assets://${block.id}/photo.png)`,
      ].join("\n");

      const result = await externalizeMarkdownAssetUrls({ paths }, ctx.db, content);

      expect(result).toBe(
        [
          `![One](file:///tmp/${block.id}/photo.png)`,
          `![Two](file:///tmp/${block.id}/photo.png)`,
        ].join("\n"),
      );
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("externalizes markdown image destinations without changing matching alt text", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "content");
      const assetUrl = `assets://${block.id}/photo.png`;
      const content = [`![${assetUrl}](${assetUrl})`, `![${assetUrl}](${assetUrl} "Preview")`].join(
        "\n",
      );

      const result = await externalizeMarkdownAssetUrls({ paths }, ctx.db, content);

      expect(result).toBe(
        [
          `![${assetUrl}](file:///tmp/${block.id}/photo.png)`,
          `![${assetUrl}](file:///tmp/${block.id}/photo.png "Preview")`,
        ].join("\n"),
      );
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });
});
