import { invoke } from "@/app/invoke";
import type { Block } from "@/clients/blocks";

export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
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

export async function listTags(): Promise<Tag[]> {
  return await invoke<Tag[]>("tags_list");
}

export async function createTag(req: CreateTagRequest): Promise<Tag> {
  return await invoke<Tag>("tags_create", { ...req });
}

export async function deleteTag(req: DeleteTagRequest): Promise<void> {
  await invoke("tags_delete", { ...req });
}

export async function setBlockTags(req: SetBlockTagsRequest): Promise<Block> {
  return await invoke<Block>("tags_set_block_tags", { ...req });
}
