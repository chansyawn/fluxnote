export {
  ipcCommandContracts,
  ipcCommandKeys,
  type IpcCommandContract,
  type IpcCommandKey,
  type IpcRequest,
  type IpcResponse,
  type ParsedIpcRequest,
} from "./registry/command-contracts";
export {
  ipcEventContracts,
  ipcEventKeys,
  type IpcEventContract,
  type IpcEventKey,
  type IpcEventPayload,
} from "./registry/event-contracts";

import type { IpcRequest, IpcResponse, ParsedIpcRequest } from "./registry/command-contracts";

export type GreetRequest = IpcRequest<"sampleGreet">;
export type GreetResponse = IpcResponse<"sampleGreet">;
export type ListBlocksRequest = IpcRequest<"blocksList">;
export type ParsedListBlocksRequest = ParsedIpcRequest<"blocksList">;
export type ListBlocksResult = IpcResponse<"blocksList">;
export type LocateBlockRequest = IpcRequest<"blocksLocate">;
export type LocateBlockResult = IpcResponse<"blocksLocate">;
export type UpdateBlockContentRequest = IpcRequest<"blocksUpdateContent">;
export type BlockMutationRequest = IpcRequest<"blocksArchive">;
export type DeleteBlockRequest = IpcRequest<"blocksDelete">;
export type DeleteBlockResult = IpcResponse<"blocksDelete">;
export type CreateTagRequest = IpcRequest<"tagsCreate">;
export type DeleteTagRequest = IpcRequest<"tagsDelete">;
export type SetBlockTagsRequest = IpcRequest<"tagsSetBlockTags">;
export type CreateAssetRequest = IpcRequest<"assetsCreate">;
export type CreateAssetResult = IpcResponse<"assetsCreate">;
export type CopyAssetRequest = IpcRequest<"assetsCopy">;
export type CopyAssetResult = IpcResponse<"assetsCopy">;
export type OpenBlockPending = IpcResponse<"openBlockPendingRead">;
export type OpenBlockPendingAcknowledgeRequest = IpcRequest<"openBlockPendingAcknowledge">;
export type ShortcutRequest = IpcRequest<"shortcutRegister">;
export type PreferencesSnapshot = IpcResponse<"preferencesRead">;
export type ExternalEditCancelRequest = IpcRequest<"externalEditsCancel">;
export type ExternalEditSubmitRequest = IpcRequest<"externalEditsSubmit">;

export {
  externalEditSessionSchema,
  type ExternalEditSession,
} from "../domains/external-edit/session-contracts";
export type { AutoArchiveStateChangedPayload } from "../domains/blocks/ipc-events";
export { autoArchiveStateChangedPayloadSchema } from "../domains/blocks/ipc-events";
export type { OpenBlockRequestedPayload } from "../domains/open-block/ipc-events";
export { openBlockRequestedPayloadSchema } from "../domains/open-block/ipc-events";
export type { ExternalEditSessionsChangedPayload } from "../domains/external-edit/ipc-events";
export { externalEditSessionsChangedPayloadSchema } from "../domains/external-edit/ipc-events";
export type { ShortcutPressedPayload } from "../domains/shortcut/ipc-events";
export { shortcutPressedPayloadSchema } from "../domains/shortcut/ipc-events";
export type {
  WindowCloseRequestedPayload,
  WindowFocusChangedPayload,
} from "../domains/window/ipc-events";
export {
  windowCloseRequestedPayloadSchema,
  windowFocusChangedPayloadSchema,
} from "../domains/window/ipc-events";

// 供 blockSchema 等：与历史 API 一致
export { blockSchema, type Block } from "../domains/blocks/models";
export { tagSchema, type Tag } from "../domains/tags/models";
export { openBlockPendingSchema } from "../domains/open-block/models";
export {
  blockVisibilitySchema,
  blocksListRequestSchema,
  blocksListResponseSchema,
} from "../domains/blocks/models";
export {
  blocksLocateRequestSchema,
  blocksLocateResponseSchema,
  blockMutationRequestSchema,
} from "../domains/blocks/models";
