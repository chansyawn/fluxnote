import { invokeCommand } from "@renderer/app/invoke";
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
  invokeCommand("blocksList", req);

export const locateBlock = (req: LocateBlockRequest): Promise<LocateBlockResult> =>
  invokeCommand("blocksLocate", req);

export const createBlock = (): Promise<Block> => invokeCommand("blocksCreate", undefined);

export const updateBlockContent = (req: UpdateBlockContentRequest): Promise<Block> =>
  invokeCommand("blocksUpdateContent", req);

export const deleteBlock = (req: DeleteBlockRequest): Promise<DeleteBlockResult> =>
  invokeCommand("blocksDelete", req);

export const archiveBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocksArchive", req);

export const restoreBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocksRestore", req);
