import { invokeCommand } from "@renderer/ipc-client";
import type { Block } from "@shared/features/blocks";
import type {
  CreateTagRequest,
  DeleteTagRequest,
  SetBlockTagsRequest,
  Tag,
} from "@shared/features/tags";

export type {
  CreateTagRequest,
  DeleteTagRequest,
  SetBlockTagsRequest,
  Tag,
} from "@shared/features/tags";

export const listTags = (): Promise<Tag[]> => invokeCommand("tags.list", undefined);

export const createTag = (req: CreateTagRequest): Promise<Tag> => invokeCommand("tags.create", req);

export const deleteTag = (req: DeleteTagRequest): Promise<void> =>
  invokeCommand("tags.delete", req);

export const setBlockTags = (req: SetBlockTagsRequest): Promise<Block> =>
  invokeCommand("tags.setBlockTags", req);
