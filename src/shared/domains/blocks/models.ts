import { z } from "zod";

import { tagSchema } from "../tags/models";

export const blockSchema = z.object({
  id: z.string(),
  position: z.number(),
  content: z.string(),
  archivedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  willArchive: z.boolean(),
  tags: z.array(tagSchema),
});
export type Block = z.infer<typeof blockSchema>;

export const blockMutationRequestSchema = z.object({
  blockId: z.string().min(1),
});
export const blockVisibilitySchema = z.enum(["active", "archived"]);
export const blocksListRequestSchema = z.object({
  tagIds: z.array(z.string()).optional(),
  visibility: blockVisibilitySchema.default("active"),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(200).default(50),
});
export const blocksListResponseSchema = z.object({
  blocks: z.array(blockSchema),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});
export const blocksLocateRequestSchema = z.object({
  blockId: z.string().min(1),
  tagIds: z.array(z.string()).optional(),
  visibility: blockVisibilitySchema.default("active"),
});
export const blocksLocateResponseSchema = z
  .object({
    block: blockSchema,
    index: z.number().int().min(0),
  })
  .nullable();
