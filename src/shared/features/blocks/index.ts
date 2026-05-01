import type { z } from "zod";

import type { blocksContract } from "./contract";
import { blockVisibilitySchema } from "./models";

export {
  autoArchiveStateChangedPayloadSchema,
  blocksContract,
  type AutoArchiveStateChangedPayload,
} from "./contract";
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
export type ListBlocksRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.list"]["input"]
>;
export type ParsedListBlocksRequest = z.infer<
  (typeof blocksContract)["commands"]["blocks.list"]["input"]
>;
export type ListBlocksResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.list"]["output"]
>;
export type LocateBlockRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.locate"]["input"]
>;
export type LocateBlockResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.locate"]["output"]
>;
export type UpdateBlockContentRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.updateContent"]["input"]
>;
export type BlockMutationRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.archive"]["input"]
>;
export type DeleteBlockRequest = z.input<
  (typeof blocksContract)["commands"]["blocks.delete"]["input"]
>;
export type DeleteBlockResult = z.infer<
  (typeof blocksContract)["commands"]["blocks.delete"]["output"]
>;
