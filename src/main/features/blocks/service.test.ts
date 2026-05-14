import fs from "node:fs/promises";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTag, setBlockTags } from "../tags/service";
import { createTestDb, type TestDbContext } from "../test-db";
import {
  archiveBlock,
  createBlockRecord,
  deleteBlock,
  getPublicBlockById,
  listBlocks,
  restoreBlock,
  setBlockKeepState,
  updateBlockContent,
} from "./service";

describe("blocks service", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    ctx.close();
    await ctx.cleanup();
  });

  it("creates and reads a block", async () => {
    const created = await createBlockRecord(ctx.db, "hello");

    expect(created.content).toBe("hello");
    expect(created.isKept).toBe(false);
    const loaded = await getPublicBlockById(ctx.db, created.id);
    expect(loaded.id).toBe(created.id);
  });

  it("sets block keep state", async () => {
    const block = await createBlockRecord(ctx.db, "keep me");

    const kept = await setBlockKeepState(ctx.db, block.id, true);
    const result = await listBlocks(ctx.db, undefined, "active", 0, 10);

    expect(kept.isKept).toBe(true);
    expect(result.blocks.find((item) => item.id === block.id)?.isKept).toBe(true);
  });

  it("archives block and clears keep state", async () => {
    const block = await createBlockRecord(ctx.db, "kept archive");
    await setBlockKeepState(ctx.db, block.id, true);

    const archived = await archiveBlock(ctx.db, block.id);
    const loaded = await getPublicBlockById(ctx.db, block.id);

    expect(archived.archivedAt).not.toBeNull();
    expect(archived.isKept).toBe(false);
    expect(loaded.isKept).toBe(false);
  });

  it("lists blocks by visibility", async () => {
    const active = await createBlockRecord(ctx.db, "active");
    const archived = await createBlockRecord(ctx.db, "archived");
    await archiveBlock(ctx.db, archived.id);

    const activeResult = await listBlocks(ctx.db, undefined, "active", 0, 10);
    const archivedResult = await listBlocks(ctx.db, undefined, "archived", 0, 10);

    expect(activeResult.blocks.some((block) => block.id === active.id)).toBe(true);
    expect(activeResult.blocks.some((block) => block.id === archived.id)).toBe(false);
    expect(archivedResult.blocks.some((block) => block.id === archived.id)).toBe(true);
  });

  it("filters blocks by tags", async () => {
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const tag = await createTag(ctx.db, "work");
    await setBlockTags(ctx.db, blockA.id, [tag.id]);

    const result = await listBlocks(ctx.db, [tag.id], "active", 0, 10);

    expect(result.blocks.map((block) => block.id)).toContain(blockA.id);
    expect(result.blocks.map((block) => block.id)).not.toContain(blockB.id);
  });

  it("updates content and restores archived block", async () => {
    const block = await createBlockRecord(ctx.db, "before");
    const updated = await updateBlockContent(ctx.db, block.id, "after");
    await archiveBlock(ctx.db, block.id);
    const restored = await restoreBlock(ctx.db, block.id);

    expect(updated.content).toBe("after");
    expect(restored.archivedAt).toBeNull();
  });

  it("deletes block and removes asset folder", async () => {
    const rmMock = vi.spyOn(fs, "rm").mockResolvedValue(undefined);
    const block = await createBlockRecord(ctx.db, "to-delete");

    const result = await deleteBlock(ctx.db, block.id, "/tmp/asset-path");

    expect(result).toEqual({ deletedBlockId: block.id });
    expect(rmMock).toHaveBeenCalledWith("/tmp/asset-path", { force: true, recursive: true });
  });
});
