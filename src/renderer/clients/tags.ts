import { createFeatureClient } from "@renderer/app/ipc-client";
import type { Block } from "@shared/features/blocks";
import type {
  CreateTagRequest,
  DeleteTagRequest,
  SetBlockTagsRequest,
  Tag,
} from "@shared/features/tags";
import { tagsApi } from "@shared/features/tags";

export type {
  CreateTagRequest,
  DeleteTagRequest,
  SetBlockTagsRequest,
  Tag,
} from "@shared/features/tags";

const tagsClient = createFeatureClient(tagsApi);

export const listTags = (): Promise<Tag[]> => tagsClient.commands.list(undefined);

export const createTag = (req: CreateTagRequest): Promise<Tag> => tagsClient.commands.create(req);

export const deleteTag = (req: DeleteTagRequest): Promise<void> => tagsClient.commands.delete(req);

export const setBlockTags = (req: SetBlockTagsRequest): Promise<Block> =>
  tagsClient.commands.setBlockTags(req);
