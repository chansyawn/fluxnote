import { invokeCommand } from "@renderer/app/invoke";
import type {
  Block,
  BlockMutationRequest,
  DeleteBlockRequest,
  DeleteBlockResult,
  ListBlocksRequest,
  UpdateBlockContentRequest,
} from "@shared/ipc/contracts";

export type {
  Block,
  BlockMutationRequest,
  DeleteBlockRequest,
  DeleteBlockResult,
  ListBlocksRequest,
  UpdateBlockContentRequest,
} from "@shared/ipc/contracts";

export type BlockVisibility = "active" | "archived";

export const listBlocks = (req: ListBlocksRequest = {}): Promise<Block[]> =>
  invokeCommand("blocksList", req);

export const createBlock = (): Promise<Block> => invokeCommand("blocksCreate", undefined);

export const updateBlockContent = (req: UpdateBlockContentRequest): Promise<Block> =>
  invokeCommand("blocksUpdateContent", req);

export const deleteBlock = (req: DeleteBlockRequest): Promise<DeleteBlockResult> =>
  invokeCommand("blocksDelete", req);

export const archiveBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocksArchive", req);

export const restoreBlock = (req: BlockMutationRequest): Promise<Block> =>
  invokeCommand("blocksRestore", req);
