import type { z } from "zod";

import type { tagsContract } from "./contract";

export { tagsContract } from "./contract";
export { tagSchema, type Tag } from "./models";

export type CreateTagRequest = z.input<(typeof tagsContract)["commands"]["tags.create"]["input"]>;
export type DeleteTagRequest = z.input<(typeof tagsContract)["commands"]["tags.delete"]["input"]>;
export type SetBlockTagsRequest = z.input<
  (typeof tagsContract)["commands"]["tags.setBlockTags"]["input"]
>;
