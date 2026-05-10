import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createBlockRecord, getPublicBlockById } from "../blocks/service";
import { createTestDb, type TestDbContext } from "../test-db";
import { createTag, deleteTag, listTags, setBlockTags } from "./service";

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
  });

  it("rejects duplicate tag name", async () => {
    await createTag(ctx.db, "dup");

    await expect(createTag(ctx.db, "dup")).rejects.toThrow(/Failed query: insert into "tags"/);
  });

  it("deletes existing tag", async () => {
    const tag = await createTag(ctx.db, "to-delete");

    await deleteTag(ctx.db, tag.id);

    await expect(deleteTag(ctx.db, tag.id)).rejects.toMatchObject({ code: "BUSINESS.NOT_FOUND" });
  });

  it("sets block tags and ignores missing tag ids", async () => {
    const block = await createBlockRecord(ctx.db, "content");
    const tag = await createTag(ctx.db, "work");

    await setBlockTags(ctx.db, block.id, [tag.id, "missing-id"]);
    const updated = await getPublicBlockById(ctx.db, block.id);

    expect(updated.tags.map((item) => item.id)).toEqual([tag.id]);
  });
});
