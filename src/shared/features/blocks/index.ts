import type { z } from "zod";

import type { blocksApi } from "./api";
import { blockVisibilitySchema } from "./models";

export {
  autoArchiveStateChangedPayloadSchema,
  blocksApi,
  type AutoArchiveStateChangedPayload,
} from "./api";
export {
  blockMutationRequestSchema,
  blockSchema,
  blockVisibilitySchema,
  blocksListRequestSchema,
  blocksListResponseSchema,
  blocksLocateRequestSchema,
  blocksLocateResponseSchema,
  type Block,
} from "./models";

export type BlockVisibility = z.infer<typeof blockVisibilitySchema>;
export type ListBlocksRequest = z.input<(typeof blocksApi)["commands"]["list"]["request"]>;
export type ParsedListBlocksRequest = z.infer<(typeof blocksApi)["commands"]["list"]["request"]>;
export type ListBlocksResult = z.infer<(typeof blocksApi)["commands"]["list"]["response"]>;
export type LocateBlockRequest = z.input<(typeof blocksApi)["commands"]["locate"]["request"]>;
export type LocateBlockResult = z.infer<(typeof blocksApi)["commands"]["locate"]["response"]>;
export type UpdateBlockContentRequest = z.input<
  (typeof blocksApi)["commands"]["updateContent"]["request"]
>;
export type BlockMutationRequest = z.input<(typeof blocksApi)["commands"]["archive"]["request"]>;
export type DeleteBlockRequest = z.input<(typeof blocksApi)["commands"]["delete"]["request"]>;
export type DeleteBlockResult = z.infer<(typeof blocksApi)["commands"]["delete"]["response"]>;
