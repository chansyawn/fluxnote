import { invoke } from "@/app/invoke";
import type { Tag } from "@/clients/tags";

export interface Block {
  id: string;
  position: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
}

export interface ListBlocksRequest {
  tagIds?: string[];
}

export interface UpdateBlockContentRequest {
  blockId: string;
  content: string;
}

export interface DeleteBlockRequest {
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
