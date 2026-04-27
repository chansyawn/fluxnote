import type { z } from "zod";

import type { blocksIpcCommandContracts } from "./ipc-commands";
import { blockVisibilitySchema } from "./models";

export { blocksIpcCommandContracts } from "./ipc-commands";
export {
  autoArchiveStateChangedPayloadSchema,
  blocksIpcEventContracts,
  type AutoArchiveStateChangedPayload,
} from "./ipc-events";
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
  (typeof blocksIpcCommandContracts)["blocksList"]["request"]
>;
export type ParsedListBlocksRequest = z.infer<
  (typeof blocksIpcCommandContracts)["blocksList"]["request"]
>;
export type ListBlocksResult = z.infer<
  (typeof blocksIpcCommandContracts)["blocksList"]["response"]
>;
export type LocateBlockRequest = z.input<
  (typeof blocksIpcCommandContracts)["blocksLocate"]["request"]
>;
export type LocateBlockResult = z.infer<
  (typeof blocksIpcCommandContracts)["blocksLocate"]["response"]
>;
export type UpdateBlockContentRequest = z.input<
  (typeof blocksIpcCommandContracts)["blocksUpdateContent"]["request"]
>;
export type BlockMutationRequest = z.input<
  (typeof blocksIpcCommandContracts)["blocksArchive"]["request"]
>;
export type DeleteBlockRequest = z.input<
  (typeof blocksIpcCommandContracts)["blocksDelete"]["request"]
>;
export type DeleteBlockResult = z.infer<
  (typeof blocksIpcCommandContracts)["blocksDelete"]["response"]
>;
