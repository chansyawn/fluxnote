import { z } from "zod";

import { externalEditSessionSchema } from "../external-edit-contracts";

const voidSchema = z.undefined();

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Tag = z.infer<typeof tagSchema>;

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
export const openBlockPendingSchema = z.object({
  blockId: z.string().nullable(),
});

export const ipcCommandContracts = {
  cliInstall: {
    channel: "fluxnote:cli:install",
    request: voidSchema,
    response: voidSchema,
  },
  cliStatus: {
    channel: "fluxnote:cli:status",
    request: voidSchema,
    response: z.object({
      installed: z.boolean(),
    }),
  },
  cliUninstall: {
    channel: "fluxnote:cli:uninstall",
    request: voidSchema,
    response: voidSchema,
  },
  assetsCopy: {
    channel: "fluxnote:assets:copy",
    request: z.object({
      sourceBlockId: z.string().min(1),
      targetBlockId: z.string().min(1),
      assetUrl: z.string().min(1),
    }),
    response: z.object({ assetUrl: z.string() }),
  },
  assetsCreate: {
    channel: "fluxnote:assets:create",
    request: z.object({
      blockId: z.string().min(1),
      mimeType: z.string().min(1),
      fileName: z.string().optional(),
      dataBase64: z.string().min(1),
    }),
    response: z.object({
      assetUrl: z.string(),
      altText: z.string(),
    }),
  },
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
    request: z.object({
      tagIds: z.array(z.string()).optional(),
      visibility: z.enum(["active", "archived"]).default("active"),
    }),
    response: z.array(blockSchema),
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
  externalEditsCancel: {
    channel: "fluxnote:external-edits:cancel",
    request: z.object({
      editId: z.string().min(1),
    }),
    response: voidSchema,
  },
  externalEditsList: {
    channel: "fluxnote:external-edits:list",
    request: voidSchema,
    response: z.array(externalEditSessionSchema),
  },
  externalEditsSubmit: {
    channel: "fluxnote:external-edits:submit",
    request: z.object({
      editId: z.string().min(1),
      content: z.string(),
    }),
    response: blockSchema,
  },
  openBlockPendingAcknowledge: {
    channel: "fluxnote:open-block:pending-acknowledge",
    request: z.object({
      blockId: z.string().min(1),
    }),
    response: voidSchema,
  },
  openBlockPendingRead: {
    channel: "fluxnote:open-block:pending-read",
    request: voidSchema,
    response: openBlockPendingSchema,
  },
  preferencesRead: {
    channel: "fluxnote:preferences:read",
    request: voidSchema,
    response: z.record(z.string(), z.unknown()),
  },
  preferencesWrite: {
    channel: "fluxnote:preferences:write",
    request: z.record(z.string(), z.unknown()),
    response: voidSchema,
  },
  sampleGreet: {
    channel: "fluxnote:sample:greet",
    request: z.object({
      name: z.string().trim().min(1).max(20),
    }),
    response: z.object({ message: z.string() }),
  },
  shortcutIsRegistered: {
    channel: "fluxnote:shortcut:is-registered",
    request: z.object({ shortcut: z.string().min(1) }),
    response: z.boolean(),
  },
  shortcutRegister: {
    channel: "fluxnote:shortcut:register",
    request: z.object({ shortcut: z.string().min(1) }),
    response: voidSchema,
  },
  shortcutUnregister: {
    channel: "fluxnote:shortcut:unregister",
    request: z.object({ shortcut: z.string().min(1) }),
    response: voidSchema,
  },
  tagsCreate: {
    channel: "fluxnote:tags:create",
    request: z.object({ name: z.string().trim().min(1) }),
    response: tagSchema,
  },
  tagsDelete: {
    channel: "fluxnote:tags:delete",
    request: z.object({ tagId: z.string().min(1) }),
    response: voidSchema,
  },
  tagsList: {
    channel: "fluxnote:tags:list",
    request: voidSchema,
    response: z.array(tagSchema),
  },
  tagsSetBlockTags: {
    channel: "fluxnote:tags:set-block-tags",
    request: z.object({
      blockId: z.string().min(1),
      tagIds: z.array(z.string()),
    }),
    response: blockSchema,
  },
  windowDestroy: {
    channel: "fluxnote:window:destroy",
    request: voidSchema,
    response: voidSchema,
  },
  windowHide: {
    channel: "fluxnote:window:hide",
    request: voidSchema,
    response: voidSchema,
  },
  windowToggle: {
    channel: "fluxnote:window:toggle",
    request: voidSchema,
    response: voidSchema,
  },
} as const;

export type IpcCommandKey = keyof typeof ipcCommandContracts;
export type IpcCommandContract<TKey extends IpcCommandKey = IpcCommandKey> =
  (typeof ipcCommandContracts)[TKey];
export type IpcRequest<TKey extends IpcCommandKey> = z.input<IpcCommandContract<TKey>["request"]>;
export type ParsedIpcRequest<TKey extends IpcCommandKey> = z.infer<
  IpcCommandContract<TKey>["request"]
>;
export type IpcResponse<TKey extends IpcCommandKey> = z.infer<IpcCommandContract<TKey>["response"]>;

export type GreetRequest = IpcRequest<"sampleGreet">;
export type GreetResponse = IpcResponse<"sampleGreet">;
export type ListBlocksRequest = IpcRequest<"blocksList">;
export type ParsedListBlocksRequest = ParsedIpcRequest<"blocksList">;
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
export type { ExternalEditSession } from "../external-edit-contracts";
export type ExternalEditCancelRequest = IpcRequest<"externalEditsCancel">;
export type ExternalEditSubmitRequest = IpcRequest<"externalEditsSubmit">;

export const autoArchiveStateChangedPayloadSchema = z.object({
  archivedCount: z.number(),
  pendingCount: z.number(),
  windowVisible: z.boolean(),
});
export type AutoArchiveStateChangedPayload = z.infer<typeof autoArchiveStateChangedPayloadSchema>;

export const openBlockRequestedPayloadSchema = z.object({
  blockId: z.string(),
});
export type OpenBlockRequestedPayload = z.infer<typeof openBlockRequestedPayloadSchema>;

export const externalEditSessionsChangedPayloadSchema = z.array(externalEditSessionSchema);
export type ExternalEditSessionsChangedPayload = z.infer<
  typeof externalEditSessionsChangedPayloadSchema
>;

export const shortcutPressedPayloadSchema = z.object({
  shortcut: z.string(),
  state: z.enum(["Pressed", "Released"]),
});
export type ShortcutPressedPayload = z.infer<typeof shortcutPressedPayloadSchema>;

export const windowCloseRequestedPayloadSchema = z.null();
export type WindowCloseRequestedPayload = z.infer<typeof windowCloseRequestedPayloadSchema>;

export const windowFocusChangedPayloadSchema = z.boolean();
export type WindowFocusChangedPayload = z.infer<typeof windowFocusChangedPayloadSchema>;

export const ipcEventContracts = {
  autoArchiveStateChanged: {
    channel: "fluxnote:event:auto-archive://state-changed",
    payload: autoArchiveStateChangedPayloadSchema,
  },
  externalEditSessionsChanged: {
    channel: "fluxnote:event:external-edit://sessions-changed",
    payload: externalEditSessionsChangedPayloadSchema,
  },
  openBlockRequested: {
    channel: "fluxnote:event:open-block://requested",
    payload: openBlockRequestedPayloadSchema,
  },
  shortcutPressed: {
    channel: "fluxnote:event:shortcut://pressed",
    payload: shortcutPressedPayloadSchema,
  },
  windowCloseRequested: {
    channel: "fluxnote:event:window://close-requested",
    payload: windowCloseRequestedPayloadSchema,
  },
  windowFocusChanged: {
    channel: "fluxnote:event:window://focus-changed",
    payload: windowFocusChangedPayloadSchema,
  },
} as const;

export type IpcEventKey = keyof typeof ipcEventContracts;
export type IpcEventContract<TKey extends IpcEventKey = IpcEventKey> =
  (typeof ipcEventContracts)[TKey];
export type IpcEventPayload<TKey extends IpcEventKey> = z.infer<IpcEventContract<TKey>["payload"]>;

export const ipcCommandKeys = Object.keys(ipcCommandContracts) as IpcCommandKey[];
export const ipcEventKeys = Object.keys(ipcEventContracts) as IpcEventKey[];
