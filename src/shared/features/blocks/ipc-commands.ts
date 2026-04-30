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
    channel: "fluxnotes:blocks:archive",
    request: blockMutationRequestSchema,
    response: blockSchema,
  },
  blocksCreate: {
    channel: "fluxnotes:blocks:create",
    request: voidSchema,
    response: blockSchema,
  },
  blocksDelete: {
    channel: "fluxnotes:blocks:delete",
    request: blockMutationRequestSchema,
    response: z.object({ deletedBlockId: z.string() }),
  },
  blocksList: {
    channel: "fluxnotes:blocks:list",
    request: blocksListRequestSchema,
    response: blocksListResponseSchema,
  },
  blocksLocate: {
    channel: "fluxnotes:blocks:locate",
    request: blocksLocateRequestSchema,
    response: blocksLocateResponseSchema,
  },
  blocksRestore: {
    channel: "fluxnotes:blocks:restore",
    request: blockMutationRequestSchema,
    response: blockSchema,
  },
  blocksUpdateContent: {
    channel: "fluxnotes:blocks:update-content",
    request: z.object({
      blockId: z.string().min(1),
      content: z.string(),
    }),
    response: blockSchema,
  },
} as const;
