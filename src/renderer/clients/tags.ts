import { invokeCommand } from "@renderer/app/invoke";
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

export const listTags = (): Promise<Tag[]> => invokeCommand("tagsList", undefined);

export const createTag = (req: CreateTagRequest): Promise<Tag> => invokeCommand("tagsCreate", req);

export const deleteTag = (req: DeleteTagRequest): Promise<void> => invokeCommand("tagsDelete", req);

export const setBlockTags = (req: SetBlockTagsRequest): Promise<Block> =>
  invokeCommand("tagsSetBlockTags", req);
