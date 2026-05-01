import type { Block } from "@shared/features/blocks/models";
import { tagsContract } from "@shared/features/tags/contract";
import { type Tag } from "@shared/features/tags/models";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type CreateTagRequest = z.input<(typeof tagsContract)["commands"]["tags.create"]["input"]>;
export type DeleteTagRequest = z.input<(typeof tagsContract)["commands"]["tags.delete"]["input"]>;
export type SetBlockTagsRequest = z.input<
  (typeof tagsContract)["commands"]["tags.setBlockTags"]["input"]
>;
export type { Tag };

export const listTags = (): Promise<Tag[]> => invokeCommand("tags.list", undefined);

export const createTag = (req: CreateTagRequest): Promise<Tag> => invokeCommand("tags.create", req);

export const deleteTag = (req: DeleteTagRequest): Promise<void> =>
  invokeCommand("tags.delete", req);

export const setBlockTags = (req: SetBlockTagsRequest): Promise<Block> =>
  invokeCommand("tags.setBlockTags", req);
