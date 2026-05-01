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
  (typeof blocksContract)["commands"]["blocks.updateContent"]["input"]
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
  invokeCommand("blocks.updateContent", req);

export const deleteBlock = (req: DeleteBlockRequest): Promise<DeleteBlockResult> =>
  invokeCommand("blocks.delete", req);

export const archiveBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocks.archive", req);

export const restoreBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocks.restore", req);
