import { assetsApi } from "@shared/features/assets/api";
import { blocksApi } from "@shared/features/blocks/api";
import { cliApi } from "@shared/features/cli/api";
import { externalEditApi } from "@shared/features/external-edit/api";
import { openBlockApi } from "@shared/features/open-block/api";
import { preferencesApi } from "@shared/features/preferences/api";
import { shortcutApi } from "@shared/features/shortcut/api";
import { tagsApi } from "@shared/features/tags/api";
import { windowApi } from "@shared/features/window/api";

import type {
  FeatureApi,
  FeatureCommandContract,
  FeatureCommandInput,
  FeatureCommandOutput,
  FeatureEventContract,
  FeatureEventPayload,
  ParsedFeatureCommandInput,
} from "./feature-api";

export const allFeatureApis = [
  cliApi,
  assetsApi,
  blocksApi,
  externalEditApi,
  openBlockApi,
  preferencesApi,
  shortcutApi,
  tagsApi,
  windowApi,
] as const satisfies readonly FeatureApi[];

export const ipcCommandContracts = {
  "assets.copy": assetsApi.commands.copy,
  "assets.create": assetsApi.commands.create,
  "blocks.archive": blocksApi.commands.archive,
  "blocks.create": blocksApi.commands.create,
  "blocks.delete": blocksApi.commands.delete,
  "blocks.list": blocksApi.commands.list,
  "blocks.locate": blocksApi.commands.locate,
  "blocks.restore": blocksApi.commands.restore,
  "blocks.updateContent": blocksApi.commands.updateContent,
  "cli.install": cliApi.commands.install,
  "cli.status": cliApi.commands.status,
  "cli.uninstall": cliApi.commands.uninstall,
  "externalEdit.cancel": externalEditApi.commands.cancel,
  "externalEdit.list": externalEditApi.commands.list,
  "externalEdit.submit": externalEditApi.commands.submit,
  "openBlock.acknowledgePending": openBlockApi.commands.acknowledgePending,
  "openBlock.readPending": openBlockApi.commands.readPending,
  "preferences.patch": preferencesApi.commands.patch,
  "preferences.read": preferencesApi.commands.read,
  "preferences.reset": preferencesApi.commands.reset,
  "shortcut.isRegistered": shortcutApi.commands.isRegistered,
  "shortcut.register": shortcutApi.commands.register,
  "shortcut.unregister": shortcutApi.commands.unregister,
  "tags.create": tagsApi.commands.create,
  "tags.delete": tagsApi.commands.delete,
  "tags.list": tagsApi.commands.list,
  "tags.setBlockTags": tagsApi.commands.setBlockTags,
  "window.destroy": windowApi.commands.destroy,
  "window.hide": windowApi.commands.hide,
  "window.toggle": windowApi.commands.toggle,
} as const satisfies Record<string, FeatureCommandContract>;

export const ipcEventContracts = {
  "blocks.autoArchiveStateChanged": blocksApi.events.autoArchiveStateChanged,
  "externalEdit.sessionsChanged": externalEditApi.events.sessionsChanged,
  "openBlock.requested": openBlockApi.events.requested,
  "shortcut.pressed": shortcutApi.events.pressed,
  "window.closeRequested": windowApi.events.closeRequested,
  "window.focusChanged": windowApi.events.focusChanged,
} as const satisfies Record<string, FeatureEventContract>;

export type IpcCommandKey = keyof typeof ipcCommandContracts;
export type IpcCommandContract<TKey extends IpcCommandKey = IpcCommandKey> =
  (typeof ipcCommandContracts)[TKey];
export type IpcRequest<TKey extends IpcCommandKey> = FeatureCommandInput<IpcCommandContract<TKey>>;
export type ParsedIpcRequest<TKey extends IpcCommandKey> = ParsedFeatureCommandInput<
  IpcCommandContract<TKey>
>;
export type IpcResponse<TKey extends IpcCommandKey> = FeatureCommandOutput<
  IpcCommandContract<TKey>
>;

export type IpcEventKey = keyof typeof ipcEventContracts;
export type IpcEventContract<TKey extends IpcEventKey = IpcEventKey> =
  (typeof ipcEventContracts)[TKey];
export type IpcEventPayload<TKey extends IpcEventKey> = FeatureEventPayload<IpcEventContract<TKey>>;

export const ipcCommandKeys = Object.keys(ipcCommandContracts) as IpcCommandKey[];
export const ipcEventKeys = Object.keys(ipcEventContracts) as IpcEventKey[];
