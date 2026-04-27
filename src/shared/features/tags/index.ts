import type { z } from "zod";

import type { tagsIpcCommandContracts } from "./ipc-commands";

export { tagsIpcCommandContracts } from "./ipc-commands";
export { tagSchema, type Tag } from "./models";

export type CreateTagRequest = z.input<(typeof tagsIpcCommandContracts)["tagsCreate"]["request"]>;
export type DeleteTagRequest = z.input<(typeof tagsIpcCommandContracts)["tagsDelete"]["request"]>;
export type SetBlockTagsRequest = z.input<
  (typeof tagsIpcCommandContracts)["tagsSetBlockTags"]["request"]
>;
