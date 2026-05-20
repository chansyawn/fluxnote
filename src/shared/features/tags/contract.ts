import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { tagColorSchema, tagIconSchema, tagSchema } from "./models";

const voidSchema = z.undefined();

export const tagsContract = {
  commands: {
    "tags.create": {
      input: z.object({
        name: z.string().trim().min(1),
        color: tagColorSchema.optional(),
      }),
      output: tagSchema,
    },
    "tags.delete": {
      input: z.object({ tagId: z.string().min(1) }),
      output: voidSchema,
    },
    "tags.update": {
      input: z.object({
        tagId: z.string().min(1),
        name: z.string().trim().min(1),
        icon: tagIconSchema,
        color: tagColorSchema,
      }),
      output: tagSchema,
    },
    "tags.list": {
      input: voidSchema,
      output: z.array(tagSchema),
    },
    "tags.set-block-tags": {
      input: z.object({
        blockId: z.string().min(1),
        tagIds: z.array(z.string()),
      }),
      output: blockSchema,
    },
  },
  events: {},
} as const;
