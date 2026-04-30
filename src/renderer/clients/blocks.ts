import { createFeatureClient } from "@renderer/app/ipc-client";
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
import { blocksApi } from "@shared/features/blocks";

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

const blocksClient = createFeatureClient(blocksApi);

export const listBlocks = (req: ListBlocksRequest = {}): Promise<ListBlocksResult> =>
  blocksClient.commands.list(req);

export const locateBlock = (req: LocateBlockRequest): Promise<LocateBlockResult> =>
  blocksClient.commands.locate(req);

export const createBlock = (): Promise<Block> => blocksClient.commands.create(undefined);

export const updateBlockContent = (req: UpdateBlockContentRequest): Promise<Block> =>
  blocksClient.commands.updateContent(req);

export const deleteBlock = (req: DeleteBlockRequest): Promise<DeleteBlockResult> =>
  blocksClient.commands.delete(req);

export const archiveBlock = (req: BlockMutationRequest): Promise<Block> =>
  blocksClient.commands.archive(req);

export const restoreBlock = (req: BlockMutationRequest): Promise<Block> =>
  blocksClient.commands.restore(req);
