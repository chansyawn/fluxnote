import { z } from "zod";

import {
  blockMutationRequestSchema,
  blockSchema,
  blocksListRequestSchema,
  blocksListResponseSchema,
  blocksLocateRequestSchema,
  blocksLocateResponseSchema,
} from "./models";

const voidSchema = z.undefined();

export const blocksIpcCommandContracts = {
  blocksArchive: {
    channel: "fluxnote:blocks:archive",
    request: blockMutationRequestSchema,
    response: blockSchema,
  },
  blocksCreate: {
    channel: "fluxnote:blocks:create",
    request: voidSchema,
    response: blockSchema,
  },
  blocksDelete: {
    channel: "fluxnote:blocks:delete",
    request: blockMutationRequestSchema,
    response: z.object({ deletedBlockId: z.string() }),
  },
  blocksList: {
    channel: "fluxnote:blocks:list",
    request: blocksListRequestSchema,
    response: blocksListResponseSchema,
  },
  blocksLocate: {
    channel: "fluxnote:blocks:locate",
    request: blocksLocateRequestSchema,
    response: blocksLocateResponseSchema,
  },
  blocksRestore: {
    channel: "fluxnote:blocks:restore",
    request: blockMutationRequestSchema,
    response: blockSchema,
  },
  blocksUpdateContent: {
    channel: "fluxnote:blocks:update-content",
    request: z.object({
      blockId: z.string().min(1),
      content: z.string(),
    }),
    response: blockSchema,
  },
} as const;
