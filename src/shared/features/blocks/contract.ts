import { z } from "zod";

import {
  blockMutationRequestSchema,
  blockKeepStateRequestSchema,
  blockSchema,
  blocksDeleteArchivedResponseSchema,
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

export const blocksContract = {
  commands: {
    "blocks.archive": {
      input: blockMutationRequestSchema,
      output: blockSchema,
    },
    "blocks.create": {
      input: voidSchema,
      output: blockSchema,
    },
    "blocks.delete": {
      input: blockMutationRequestSchema,
      output: z.object({ deletedBlockId: z.string() }),
    },
    "blocks.delete-archived": {
      input: voidSchema,
      output: blocksDeleteArchivedResponseSchema,
    },
    "blocks.list": {
      input: blocksListRequestSchema,
      output: blocksListResponseSchema,
    },
    "blocks.locate": {
      input: blocksLocateRequestSchema,
      output: blocksLocateResponseSchema,
    },
    "blocks.restore": {
      input: blockMutationRequestSchema,
      output: blockSchema,
    },
    "blocks.set-keep-state": {
      input: blockKeepStateRequestSchema,
      output: blockSchema,
    },
    "blocks.update-content": {
      input: z.object({
        blockId: z.string().min(1),
        content: z.string(),
      }),
      output: blockSchema,
    },
  },
  events: {
    "blocks.auto-archive-state-changed": autoArchiveStateChangedPayloadSchema,
  },
} as const;
