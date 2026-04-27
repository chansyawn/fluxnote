import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { tagSchema } from "./models";

const voidSchema = z.undefined();

export const tagsIpcCommandContracts = {
  tagsCreate: {
    channel: "fluxnote:tags:create",
    request: z.object({ name: z.string().trim().min(1) }),
    response: tagSchema,
  },
  tagsDelete: {
    channel: "fluxnote:tags:delete",
    request: z.object({ tagId: z.string().min(1) }),
    response: voidSchema,
  },
  tagsList: {
    channel: "fluxnote:tags:list",
    request: voidSchema,
    response: z.array(tagSchema),
  },
  tagsSetBlockTags: {
    channel: "fluxnote:tags:set-block-tags",
    request: z.object({
      blockId: z.string().min(1),
      tagIds: z.array(z.string()),
    }),
    response: blockSchema,
  },
} as const;
