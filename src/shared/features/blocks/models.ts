import { z } from "zod";

import { tagColorSchema, tagIconSchema } from "../tags/models";

const blockTagSchema = z.object({
  color: tagColorSchema,
  id: z.string(),
  icon: tagIconSchema,
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const blockSchema = z.object({
  id: z.string(),
  content: z.string(),
  contentUpdatedAt: z.string(),
  archivedAt: z.string().nullable(),
  isKept: z.boolean(),
  isPinned: z.boolean(),
  orderIndex: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  willArchive: z.boolean(),
  tags: z.array(blockTagSchema),
});
export type Block = z.infer<typeof blockSchema>;

export const blockMutationRequestSchema = z.object({
  blockId: z.string().min(1),
});
export const blockKeepStateRequestSchema = z.object({
  blockId: z.string().min(1),
  isKept: z.boolean(),
});
export const blockPinnedStateRequestSchema = z.object({
  blockId: z.string().min(1),
  isPinned: z.boolean(),
});
export const blockReorderOperationSchema = z.enum(["move-up", "move-down", "move-to-top"]);
export const blockReorderRequestSchema = z.object({
  blockId: z.string().min(1),
  operation: blockReorderOperationSchema,
  tagIds: z.array(z.string()).optional(),
});
export const blockReorderResponseSchema = z.object({
  block: blockSchema,
  changed: z.boolean(),
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
export const blocksDeleteArchivedResponseSchema = z.object({
  deletedCount: z.number().int().min(0),
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
