import { queryClient } from "@renderer/app/query";
import type { Block, ListBlocksResult } from "@renderer/clients";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  getCachedWorkspaceBlock,
  getWorkspaceBlockPageOffset,
  normalizeWorkspaceBlockView,
  patchWorkspaceBlock,
  workspaceBlockListPageQueryKey,
  workspaceBlockListQueryKey,
} from "./workspace-block-collection";

function createBlock(id: string, content = ""): Block {
  return {
    archivedAt: null,
    content,
    contentUpdatedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    isKept: false,
    tags: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    willArchive: false,
  };
}

function createPage(blocks: Block[], offset = 0): ListBlocksResult {
  return {
    blocks,
    limit: 10,
    offset,
    totalCount: blocks.length,
  };
}

describe("workspace block collection", () => {
  afterEach(() => {
    queryClient.clear();
  });

  it("normalizes tag ids in workspace block view keys", () => {
    const view = { visibility: "active" as const, tagIds: ["tag-b", "tag-a"] };

    expect(normalizeWorkspaceBlockView(view)).toEqual({
      visibility: "active",
      tagIds: ["tag-a", "tag-b"],
    });
    expect(workspaceBlockListQueryKey(view)).toEqual(["blocks", "active", ["tag-a", "tag-b"]]);
    expect(workspaceBlockListPageQueryKey(view, 20)).toEqual([
      "blocks",
      "active",
      ["tag-a", "tag-b"],
      "page",
      20,
    ]);
  });

  it("maps block indexes to workspace page offsets", () => {
    expect(getWorkspaceBlockPageOffset(0)).toBe(0);
    expect(getWorkspaceBlockPageOffset(9)).toBe(0);
    expect(getWorkspaceBlockPageOffset(10)).toBe(10);
  });

  it("patches a block across cached workspace pages", () => {
    const firstBlock = createBlock("block-1", "old");
    const secondBlock = createBlock("block-2", "unchanged");
    const queryKey = workspaceBlockListPageQueryKey({ visibility: "active", tagIds: [] }, 0);
    queryClient.setQueryData(queryKey, createPage([firstBlock, secondBlock]));

    patchWorkspaceBlock(createBlock("block-1", "new"));

    expect(queryClient.getQueryData<ListBlocksResult>(queryKey)?.blocks).toMatchObject([
      { id: "block-1", content: "new" },
      { id: "block-2", content: "unchanged" },
    ]);
  });

  it("finds cached blocks across workspace pages", () => {
    queryClient.setQueryData(
      workspaceBlockListPageQueryKey({ visibility: "active", tagIds: [] }, 0),
      createPage([createBlock("block-1")]),
    );
    queryClient.setQueryData(
      workspaceBlockListPageQueryKey({ visibility: "archived", tagIds: [] }, 0),
      createPage([createBlock("block-2", "cached")]),
    );

    expect(getCachedWorkspaceBlock("block-2")?.content).toBe("cached");
    expect(getCachedWorkspaceBlock("missing")).toBeUndefined();
  });
});
