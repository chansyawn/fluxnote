import { command, defineFeatureApi } from "@shared/ipc/feature-api";
import { z } from "zod";

import { blockSchema } from "../blocks/models";
import { tagSchema } from "./models";

const voidSchema = z.undefined();

export const tagsApi = defineFeatureApi({
  commands: {
    create: command({
      request: z.object({ name: z.string().trim().min(1) }),
      response: tagSchema,
    }),
    delete: command({
      request: z.object({ tagId: z.string().min(1) }),
      response: voidSchema,
    }),
    list: command({
      request: voidSchema,
      response: z.array(tagSchema),
    }),
    setBlockTags: command({
      request: z.object({
        blockId: z.string().min(1),
        tagIds: z.array(z.string()),
      }),
      response: blockSchema,
    }),
  },
  name: "tags",
});
