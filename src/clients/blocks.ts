import { invoke } from "@/app/invoke";
import type { Tag } from "@/clients/tags";

export interface Block {
  id: string;
  position: number;
  content: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export type BlockVisibility = "active" | "archived";

export interface ListBlocksRequest {
  tagIds?: string[];
  visibility?: BlockVisibility;
}

export interface UpdateBlockContentRequest {
  blockId: string;
  content: string;
}

export interface DeleteBlockRequest {
  blockId: string;
}

export interface BlockMutationRequest {
  blockId: string;
}

export interface DeleteBlockResult {
  deletedBlockId: string;
}

export async function listBlocks(req: ListBlocksRequest = {}): Promise<Block[]> {
  return await invoke<Block[]>("blocks_list", { ...req });
}

export async function createBlock(): Promise<Block> {
  return await invoke<Block>("blocks_create");
}

export async function updateBlockContent(req: UpdateBlockContentRequest): Promise<Block> {
  return await invoke<Block>("blocks_update_content", { ...req });
}

export async function deleteBlock(req: DeleteBlockRequest): Promise<DeleteBlockResult> {
  return await invoke<DeleteBlockResult>("blocks_delete", { ...req });
}

export async function archiveBlock(req: BlockMutationRequest): Promise<Block> {
  return await invoke<Block>("blocks_archive", { ...req });
}

export async function restoreBlock(req: BlockMutationRequest): Promise<Block> {
  return await invoke<Block>("blocks_restore", { ...req });
}
