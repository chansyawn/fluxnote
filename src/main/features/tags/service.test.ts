import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createBlockRecord, getPublicBlockById } from "../blocks/service";
import { createTestDb, type TestDbContext } from "../test-db";
import {
  createTag,
  deleteTag,
  listTags,
  setBlockTags,
  setBlockTagsByName,
  updateTag,
} from "./service";

describe("tags service", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createTestDb();
  });

  afterEach(async () => {
    ctx.close();
    await ctx.cleanup();
  });

  it("creates and lists tags in case-insensitive order", async () => {
    await createTag(ctx.db, "Zoo");
    await createTag(ctx.db, "alpha");

    const result = await listTags(ctx.db);

    expect(result.map((item) => item.name)).toEqual(["alpha", "Zoo"]);
    expect(result).toEqual([
      expect.objectContaining({ color: null, icon: null }),
      expect.objectContaining({ color: null, icon: null }),
    ]);
  });

  it("creates a tag with an explicit color", async () => {
    const result = await createTag(ctx.db, "Work", "#2563EB");

    expect(result).toMatchObject({
      color: "#2563EB",
      icon: null,
      name: "Work",
    });
  });

  it("rejects duplicate tag name", async () => {
    await createTag(ctx.db, "dup");

    await expect(createTag(ctx.db, "dup")).rejects.toMatchObject({
      code: "BUSINESS.INVALID_OPERATION",
    });
  });

  it("deletes existing tag", async () => {
    const tag = await createTag(ctx.db, "to-delete");

    await deleteTag(ctx.db, tag.id);

    await expect(deleteTag(ctx.db, tag.id)).rejects.toMatchObject({ code: "BUSINESS.NOT_FOUND" });
  });

  it("updates tag name icon and color", async () => {
    const tag = await createTag(ctx.db, "draft");

    const result = await updateTag(ctx.db, tag.id, {
      color: "#AABBCC",
      icon: "lucide:rocket",
      name: "Launch",
    });

    expect(result).toMatchObject({
      color: "#AABBCC",
      icon: "lucide:rocket",
      id: tag.id,
      name: "Launch",
    });
    expect(await listTags(ctx.db)).toEqual([result]);
  });

  it("allows updating a tag without changing values", async () => {
    const tag = await createTag(ctx.db, "stable");

    const result = await updateTag(ctx.db, tag.id, {
      color: tag.color,
      icon: tag.icon,
      name: tag.name,
    });

    expect(result).toMatchObject({
      color: tag.color,
      icon: tag.icon,
      id: tag.id,
      name: tag.name,
    });
  });

  it("rejects duplicate tag name on update", async () => {
    const first = await createTag(ctx.db, "first");
    await createTag(ctx.db, "second");

    await expect(
      updateTag(ctx.db, first.id, {
        color: first.color,
        icon: first.icon,
        name: "second",
      }),
    ).rejects.toMatchObject({ code: "BUSINESS.INVALID_OPERATION" });
  });

  it("sets block tags and ignores missing tag ids", async () => {
    const block = await createBlockRecord(ctx.db, "content");
    const tag = await createTag(ctx.db, "work");

    await setBlockTags(ctx.db, block.id, [tag.id, "missing-id"]);
    const updated = await getPublicBlockById(ctx.db, block.id);

    expect(updated.tags).toEqual([tag]);
  });

  it("creates missing tags by name and assigns them to a block", async () => {
    const block = await createBlockRecord(ctx.db, "content");

    const updated = await setBlockTagsByName(ctx.db, block.id, ["work", "idea"]);

    expect(updated.tags.map((item) => item.name)).toEqual(["idea", "work"]);
    expect(updated.tags.every((item) => item.icon === null)).toBe(true);
    expect(updated.tags.every((item) => item.color === null)).toBe(true);
    expect((await listTags(ctx.db)).map((item) => item.name)).toEqual(["idea", "work"]);
  });

  it("reuses existing tags by name when assigning them to a block", async () => {
    const block = await createBlockRecord(ctx.db, "content");
    const existing = await createTag(ctx.db, "Work");

    const updated = await setBlockTagsByName(ctx.db, block.id, ["work", "draft"]);

    expect(updated.tags.map((item) => item.name)).toEqual(["draft", "Work"]);
    expect(updated.tags.find((item) => item.name === "Work")?.id).toBe(existing.id);
    expect((await listTags(ctx.db)).map((item) => item.name)).toEqual(["draft", "Work"]);
  });

  it("deduplicates requested tag names case-insensitively", async () => {
    const block = await createBlockRecord(ctx.db, "content");

    const updated = await setBlockTagsByName(ctx.db, block.id, [
      " work ",
      "WORK",
      "",
      "idea",
      "Idea",
    ]);

    expect(updated.tags.map((item) => item.name)).toEqual(["Idea", "WORK"]);
    expect((await listTags(ctx.db)).map((item) => item.name)).toEqual(["Idea", "WORK"]);
  });
});
