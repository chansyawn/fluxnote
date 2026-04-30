import { command, defineFeatureApi, event } from "@shared/ipc/feature-api";
import { z } from "zod";

import {
  blockMutationRequestSchema,
  blockSchema,
  blocksListRequestSchema,
  blocksListResponseSchema,
  blocksLocateRequestSchema,
  blocksLocateResponseSchema,
} from "./models";

export const autoArchiveStateChangedPayloadSchema = z.object({
  archivedCount: z.number(),
  pendingCount: z.number(),
  windowVisible: z.boolean(),
});
export type AutoArchiveStateChangedPayload = z.infer<typeof autoArchiveStateChangedPayloadSchema>;

const voidSchema = z.undefined();

export const blocksApi = defineFeatureApi({
  commands: {
    archive: command({
      request: blockMutationRequestSchema,
      response: blockSchema,
    }),
    create: command({
      request: voidSchema,
      response: blockSchema,
    }),
    delete: command({
      request: blockMutationRequestSchema,
      response: z.object({ deletedBlockId: z.string() }),
    }),
    list: command({
      request: blocksListRequestSchema,
      response: blocksListResponseSchema,
    }),
    locate: command({
      request: blocksLocateRequestSchema,
      response: blocksLocateResponseSchema,
    }),
    restore: command({
      request: blockMutationRequestSchema,
      response: blockSchema,
    }),
    updateContent: command({
      request: z.object({
        blockId: z.string().min(1),
        content: z.string(),
      }),
      response: blockSchema,
    }),
  },
  events: {
    autoArchiveStateChanged: event({
      payload: autoArchiveStateChangedPayloadSchema,
    }),
  },
  name: "blocks",
});
