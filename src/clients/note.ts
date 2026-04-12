import { invoke } from "@/app/invoke";

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface CreateTagRequest {
  name: string;
}

export interface DeleteTagRequest {
  tagId: string;
}

export interface SetBlockTagsRequest {
  blockId: string;
  tagIds: string[];
}

export async function listBlocks(req: ListBlocksRequest = {}): Promise<Block[]> {
  return await invoke<Block[]>("list_blocks", { ...req });
}

export async function createBlock(): Promise<Block> {
  return await invoke<Block>("create_block");
}

export async function updateBlockContent(req: UpdateBlockContentRequest): Promise<Block> {
  return await invoke<Block>("update_block_content", { ...req });
}

export async function deleteBlock(req: DeleteBlockRequest): Promise<DeleteBlockResult> {
  return await invoke<DeleteBlockResult>("delete_block", { ...req });
}

export async function listTags(): Promise<Tag[]> {
  return await invoke<Tag[]>("list_tags");
}

export async function createTag(req: CreateTagRequest): Promise<Tag> {
  return await invoke<Tag>("create_tag", { ...req });
}

export async function deleteTag(req: DeleteTagRequest): Promise<void> {
  await invoke("delete_tag", { ...req });
}

export async function setBlockTags(req: SetBlockTagsRequest): Promise<Block> {
  return await invoke<Block>("set_block_tags", { ...req });
}
