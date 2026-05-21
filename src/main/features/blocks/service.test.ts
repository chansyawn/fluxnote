import fs from "node:fs/promises";

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { createTag, setBlockTags } from "../tags/service";
import { createTestDb, type TestDbContext } from "../test-db";
import {
  archiveBlock,
  createBlockRecord,
  deleteArchivedBlocks,
  deleteBlock,
  getPublicBlockById,
  listBlocks,
  locateBlock,
  reorderBlock,
  restoreBlock,
  setBlockKeepState,
  setBlockPinnedState,
  updateBlockContent,
} from "./service";

describe("blocks service", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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
    await setBlockPinnedState(ctx.db, block.id, true);

    const archived = await archiveBlock(ctx.db, block.id);
    const loaded = await getPublicBlockById(ctx.db, block.id);

    expect(archived.archivedAt).not.toBeNull();
    expect(archived.isKept).toBe(false);
    expect(archived.isPinned).toBe(false);
    expect(loaded.isKept).toBe(false);
    expect(loaded.isPinned).toBe(false);
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

  it("lists archived blocks by archived time descending", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");

    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    await archiveBlock(ctx.db, blockA.id);
    vi.setSystemTime(new Date("2026-01-01T00:03:00.000Z"));
    await archiveBlock(ctx.db, blockB.id);
    vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));
    await archiveBlock(ctx.db, blockC.id);

    const result = await listBlocks(ctx.db, undefined, "archived", 0, 10);

    expect(result.blocks.map((block) => block.id)).toEqual([blockB.id, blockC.id, blockA.id]);
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

  it("lists tag-filtered archived blocks by archived time descending", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");
    const tag = await createTag(ctx.db, "work");
    await setBlockTags(ctx.db, blockA.id, [tag.id]);
    await setBlockTags(ctx.db, blockB.id, [tag.id]);
    await setBlockTags(ctx.db, blockC.id, [tag.id]);

    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    await archiveBlock(ctx.db, blockA.id);
    vi.setSystemTime(new Date("2026-01-01T00:03:00.000Z"));
    await archiveBlock(ctx.db, blockB.id);
    vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));
    await archiveBlock(ctx.db, blockC.id);

    const result = await listBlocks(ctx.db, [tag.id], "archived", 0, 10);

    expect(result.blocks.map((block) => block.id)).toEqual([blockB.id, blockC.id, blockA.id]);
  });

  it("locates archived blocks by archived time descending", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");

    vi.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    await archiveBlock(ctx.db, blockA.id);
    vi.setSystemTime(new Date("2026-01-01T00:03:00.000Z"));
    await archiveBlock(ctx.db, blockB.id);
    vi.setSystemTime(new Date("2026-01-01T00:02:00.000Z"));
    await archiveBlock(ctx.db, blockC.id);

    const result = await locateBlock(ctx.db, blockC.id, undefined, "archived");

    expect(result?.block.id).toBe(blockC.id);
    expect(result?.index).toBe(1);
  });

  it("lists active blocks by pinned section and manual order", async () => {
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");
    await setBlockPinnedState(ctx.db, blockA.id, true);

    const result = await listBlocks(ctx.db, undefined, "active", 0, 10);

    expect(result.blocks.map((block) => block.id)).toEqual([blockA.id, blockC.id, blockB.id]);
  });

  it("pins block without changing keep state and unpins into the top of normal section", async () => {
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");

    const pinned = await setBlockPinnedState(ctx.db, blockA.id, true);
    const unpinned = await setBlockPinnedState(ctx.db, blockA.id, false);
    const result = await listBlocks(ctx.db, undefined, "active", 0, 10);

    expect(pinned.isPinned).toBe(true);
    expect(pinned.isKept).toBe(false);
    expect(unpinned.isPinned).toBe(false);
    expect(unpinned.isKept).toBe(false);
    expect(result.blocks.map((block) => block.id)).toEqual([blockA.id, blockB.id]);
  });

  it("preserves existing keep state when pinning and unpinning block", async () => {
    const block = await createBlockRecord(ctx.db, "A");

    await setBlockKeepState(ctx.db, block.id, true);
    await setBlockPinnedState(ctx.db, block.id, true);
    const unpinned = await setBlockPinnedState(ctx.db, block.id, false);

    expect(unpinned.isPinned).toBe(false);
    expect(unpinned.isKept).toBe(true);
  });

  it("rejects keep state changes for pinned blocks", async () => {
    const block = await createBlockRecord(ctx.db, "A");

    await setBlockPinnedState(ctx.db, block.id, true);

    await expect(setBlockKeepState(ctx.db, block.id, true)).rejects.toMatchObject({
      code: "BUSINESS.INVALID_OPERATION",
    });
  });

  it("rejects keep state changes for external edit blocks", async () => {
    const block = await createBlockRecord(ctx.db, "A");
    const autoArchiveContext = {
      cutoffIso: "2026-01-01T00:00:00.000Z",
      protectedBlockIds: new Set([block.id]),
    };

    await expect(
      setBlockKeepState(ctx.db, block.id, true, autoArchiveContext),
    ).rejects.toMatchObject({
      code: "BUSINESS.INVALID_OPERATION",
    });
  });

  it("rejects manual archive for external edit blocks", async () => {
    const block = await createBlockRecord(ctx.db, "A");
    const autoArchiveContext = {
      cutoffIso: "2026-01-01T00:00:00.000Z",
      protectedBlockIds: new Set([block.id]),
    };

    await expect(archiveBlock(ctx.db, block.id, autoArchiveContext)).rejects.toMatchObject({
      code: "BUSINESS.INVALID_OPERATION",
    });
  });

  it("reorders block inside its current section", async () => {
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");

    const movedToTop = await reorderBlock(ctx.db, blockA.id, "move-to-top", undefined);
    const movedUp = await reorderBlock(ctx.db, blockB.id, "move-up", undefined);
    const result = await listBlocks(ctx.db, undefined, "active", 0, 10);

    expect(movedToTop.changed).toBe(true);
    expect(movedUp.changed).toBe(true);
    expect(result.blocks.map((block) => block.id)).toEqual([blockA.id, blockB.id, blockC.id]);
  });

  it("reorders block by visible tag-filtered neighbors", async () => {
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");
    const blockD = await createBlockRecord(ctx.db, "D");
    const tag = await createTag(ctx.db, "work");
    await setBlockTags(ctx.db, blockA.id, [tag.id]);
    await setBlockTags(ctx.db, blockC.id, [tag.id]);

    await reorderBlock(ctx.db, blockA.id, "move-up", [tag.id]);
    const allBlocks = await listBlocks(ctx.db, undefined, "active", 0, 10);
    const taggedBlocks = await listBlocks(ctx.db, [tag.id], "active", 0, 10);

    expect(allBlocks.blocks.map((block) => block.id)).toEqual([
      blockD.id,
      blockA.id,
      blockC.id,
      blockB.id,
    ]);
    expect(taggedBlocks.blocks.map((block) => block.id)).toEqual([blockA.id, blockC.id]);
  });

  it("keeps manual reorder within pinned section", async () => {
    const blockA = await createBlockRecord(ctx.db, "A");
    const blockB = await createBlockRecord(ctx.db, "B");
    const blockC = await createBlockRecord(ctx.db, "C");
    await setBlockPinnedState(ctx.db, blockA.id, true);
    await setBlockPinnedState(ctx.db, blockB.id, true);

    await reorderBlock(ctx.db, blockA.id, "move-up", undefined);
    const result = await listBlocks(ctx.db, undefined, "active", 0, 10);

    expect(result.blocks.map((block) => block.id)).toEqual([blockA.id, blockB.id, blockC.id]);
  });

  it("updates content and restores archived block", async () => {
    const block = await createBlockRecord(ctx.db, "before");
    const otherBlock = await createBlockRecord(ctx.db, "other");
    const updated = await updateBlockContent(ctx.db, block.id, "after");
    await archiveBlock(ctx.db, block.id);
    const restored = await restoreBlock(ctx.db, block.id);
    const result = await listBlocks(ctx.db, undefined, "active", 0, 10);

    expect(updated.content).toBe("after");
    expect(restored.archivedAt).toBeNull();
    expect(result.blocks.map((item) => item.id)).toEqual([block.id, otherBlock.id]);
  });

  it("deletes block and removes asset folder", async () => {
    const rmMock = vi.spyOn(fs, "rm").mockResolvedValue(undefined);
    const block = await createBlockRecord(ctx.db, "to-delete");

    const result = await deleteBlock(ctx.db, block.id, "/tmp/asset-path");

    expect(result).toEqual({ deletedBlockId: block.id });
    expect(rmMock).toHaveBeenCalledWith("/tmp/asset-path", { force: true, recursive: true });
  });

  it("deletes archived blocks and keeps active blocks", async () => {
    const rmMock = vi.spyOn(fs, "rm").mockResolvedValue(undefined);
    const active = await createBlockRecord(ctx.db, "active");
    const archived = await createBlockRecord(ctx.db, "archived");
    await archiveBlock(ctx.db, archived.id);

    const result = await deleteArchivedBlocks(ctx.db, (blockId) => `/tmp/${blockId}`);
    const activeResult = await listBlocks(ctx.db, undefined, "active", 0, 10);
    const archivedResult = await listBlocks(ctx.db, undefined, "archived", 0, 10);

    expect(result).toEqual({ deletedCount: 1 });
    expect(activeResult.blocks.map((block) => block.id)).toContain(active.id);
    expect(archivedResult.blocks).toEqual([]);
    expect(rmMock).toHaveBeenCalledWith(`/tmp/${archived.id}`, { force: true, recursive: true });
  });

  it("returns zero when no archived blocks exist", async () => {
    const rmMock = vi.spyOn(fs, "rm").mockResolvedValue(undefined);

    const result = await deleteArchivedBlocks(ctx.db, (blockId) => `/tmp/${blockId}`);

    expect(result).toEqual({ deletedCount: 0 });
    expect(rmMock).not.toHaveBeenCalled();
  });
});
