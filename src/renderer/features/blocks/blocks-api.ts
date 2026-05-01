import { invokeCommand } from "@renderer/ipc-client";
import type {
  Block,
  BlockMutationRequest,
  DeleteBlockRequest,
  DeleteBlockResult,
  ListBlocksRequest,
  ListBlocksResult,
  LocateBlockRequest,
  LocateBlockResult,
  UpdateBlockContentRequest,
} from "@shared/features/blocks";

export type {
  Block,
  BlockMutationRequest,
  BlockVisibility,
  DeleteBlockRequest,
  DeleteBlockResult,
  ListBlocksRequest,
  ListBlocksResult,
  LocateBlockRequest,
  LocateBlockResult,
  UpdateBlockContentRequest,
} from "@shared/features/blocks";

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
