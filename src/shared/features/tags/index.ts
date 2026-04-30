import type { z } from "zod";

import type { tagsApi } from "./api";

export { tagsApi } from "./api";
export { tagSchema, type Tag } from "./models";

export type CreateTagRequest = z.input<(typeof tagsApi)["commands"]["create"]["request"]>;
export type DeleteTagRequest = z.input<(typeof tagsApi)["commands"]["delete"]["request"]>;
export type SetBlockTagsRequest = z.input<(typeof tagsApi)["commands"]["setBlockTags"]["request"]>;
