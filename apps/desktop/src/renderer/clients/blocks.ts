import { blocksContract } from "@shared/features/blocks/contract";
import { blockSchema, blockVisibilitySchema } from "@shared/features/blocks/models";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type Block = z.infer<typeof blockSchema>;
export type BlockVisibility = z.infer<typeof blockVisibilitySchema>;
export type ListBlocksRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.list"]["input"]
>;
export type ListBlocksResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.list"]["output"]
>;
export type LocateBlockRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.locate"]["input"]
>;
export type LocateBlockResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.locate"]["output"]
>;
export type UpdateBlockContentRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.update-content"]["input"]
>;
export type SetBlockKeepStateRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.set-keep-state"]["input"]
>;
export type SetBlockPinnedStateRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.set-pinned-state"]["input"]
>;
export type ReorderBlockRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.reorder"]["input"]
>;
export type ReorderBlockResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.reorder"]["output"]
>;
export type BlockMutationRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.archive"]["input"]
>;
export type DeleteBlockRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.delete"]["input"]
>;
export type DeleteBlockResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.delete"]["output"]
>;
export type DeleteArchivedBlocksResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.delete-archived"]["output"]
>;

export const listBlocks = (req: ListBlocksRequest = {}): Promise<ListBlocksResult> =>
  invokeCommand("blocks.list", {
    limit: req.limit ?? 50,
    offset: req.offset ?? 0,
    tagIds: req.tagIds,
    visibility: req.visibility ?? "active",
  });

export const locateBlock = (req: LocateBlockRequest): Promise<LocateBlockResult> =>
  invokeCommand("blocks.locate", {
    blockId: req.blockId,
    tagIds: req.tagIds,
    visibility: req.visibility ?? "active",
  });

export const createBlock = (): Promise<Block> => invokeCommand("blocks.create", undefined);

export const updateBlockContent = (req: UpdateBlockContentRequest): Promise<Block> =>
  invokeCommand("blocks.update-content", req);

export const deleteBlock = (req: DeleteBlockRequest): Promise<DeleteBlockResult> =>
  invokeCommand("blocks.delete", req);

export const deleteArchivedBlocks = (): Promise<DeleteArchivedBlocksResult> =>
  invokeCommand("blocks.delete-archived", undefined);

export const archiveBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocks.archive", req);

export const restoreBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocks.restore", req);

export const setBlockKeepState = (req: SetBlockKeepStateRequest): Promise<Block> =>
  invokeCommand("blocks.set-keep-state", req);

export const setBlockPinnedState = (req: SetBlockPinnedStateRequest): Promise<Block> =>
  invokeCommand("blocks.set-pinned-state", req);

export const reorderBlock = (req: ReorderBlockRequest): Promise<ReorderBlockResult> =>
  invokeCommand("blocks.reorder", req);
