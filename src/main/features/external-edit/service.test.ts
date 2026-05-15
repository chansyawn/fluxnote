import { describe, expect, it, vi } from "vitest";

import { createBlockRecord } from "../blocks/service";
import { createTestDb } from "../test-db";
import { cancelEdit, submitEdit } from "./service";

describe("external-edit service", () => {
  const paths = {
    assetPathForBlock: (id: string) => `/tmp/${id}`,
    assetsRootPath: "/tmp",
    databasePath: "/tmp/test.sqlite3",
    userDataPath: "/tmp",
  };

  it("submits edit and resolves session as submitted", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const resolve = vi.fn();
      const manager = {
        claim: vi.fn(() => ({
          resolve,
          session: { blockId: block.id, createdAt: new Date().toISOString(), editId: "edit-1" },
        })),
      };

      const result = await submitEdit(
        { manager: manager as never, paths },
        ctx.db,
        "edit-1",
        "after",
      );

      expect(result.content).toBe("after");
      expect(resolve).toHaveBeenCalledWith({
        blockId: block.id,
        content: "after",
        status: "submitted",
      });
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("resolves submitted session with file urls without changing stored content", async () => {
    const ctx = await createTestDb();
    try {
      const block = await createBlockRecord(ctx.db, "before");
      const resolve = vi.fn();
      const manager = {
        claim: vi.fn(() => ({
          resolve,
          session: { blockId: block.id, createdAt: new Date().toISOString(), editId: "edit-1" },
        })),
      };
      const content = [
        "Literal assets://not-an-image/photo.png",
        "",
        `![Alt](assets://${block.id}/photo.png)`,
      ].join("\n");

      const result = await submitEdit(
        { manager: manager as never, paths },
        ctx.db,
        "edit-1",
        content,
      );

      expect(result.content).toBe(content);
      expect(resolve).toHaveBeenCalledWith({
        blockId: block.id,
        content: [
          "Literal assets://not-an-image/photo.png",
          "",
          `![Alt](file:///tmp/${block.id}/photo.png)`,
        ].join("\n"),
        status: "submitted",
      });
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("resolves session as cancelled when submit fails", async () => {
    const ctx = await createTestDb();
    try {
      const resolve = vi.fn();
      const manager = {
        claim: vi.fn(() => ({
          resolve,
          session: { blockId: "missing", createdAt: new Date().toISOString(), editId: "edit-1" },
        })),
      };

      await expect(
        submitEdit({ manager: manager as never, paths }, ctx.db, "edit-1", "after"),
      ).rejects.toMatchObject({
        code: "BUSINESS.NOT_FOUND",
      });
      expect(resolve).toHaveBeenCalledWith({ blockId: "missing", status: "cancelled" });
    } finally {
      ctx.close();
      await ctx.cleanup();
    }
  });

  it("cancels edit by resolving cancelled status", async () => {
    const resolve = vi.fn();
    const manager = {
      claim: vi.fn(() => ({
        resolve,
        session: { blockId: "block-1", createdAt: new Date().toISOString(), editId: "edit-1" },
      })),
    };

    await cancelEdit({ manager: manager as never }, "edit-1");

    expect(resolve).toHaveBeenCalledWith({ blockId: "block-1", status: "cancelled" });
  });
});
