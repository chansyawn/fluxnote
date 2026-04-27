import { z } from "zod";

import { assetsIpcCommandContracts } from "../../domains/assets/ipc-commands";
import { blocksIpcCommandContracts } from "../../domains/blocks/ipc-commands";
import { cliIpcCommandContracts } from "../../domains/cli/ipc-commands";
import { externalEditIpcCommandContracts } from "../../domains/external-edit/ipc-commands";
import { openBlockIpcCommandContracts } from "../../domains/open-block/ipc-commands";
import { preferencesIpcCommandContracts } from "../../domains/preferences/ipc-commands";
import { sampleIpcCommandContracts } from "../../domains/sample/ipc-commands";
import { shortcutIpcCommandContracts } from "../../domains/shortcut/ipc-commands";
import { tagsIpcCommandContracts } from "../../domains/tags/ipc-commands";
import { windowIpcCommandContracts } from "../../domains/window/ipc-commands";

export const ipcCommandContracts = {
  ...cliIpcCommandContracts,
  ...assetsIpcCommandContracts,
  ...blocksIpcCommandContracts,
  ...externalEditIpcCommandContracts,
  ...openBlockIpcCommandContracts,
  ...preferencesIpcCommandContracts,
  ...sampleIpcCommandContracts,
  ...shortcutIpcCommandContracts,
  ...tagsIpcCommandContracts,
  ...windowIpcCommandContracts,
} as const;

export type IpcCommandKey = keyof typeof ipcCommandContracts;
export type IpcCommandContract<TKey extends IpcCommandKey = IpcCommandKey> =
  (typeof ipcCommandContracts)[TKey];
export type IpcRequest<TKey extends IpcCommandKey> = z.input<IpcCommandContract<TKey>["request"]>;
export type ParsedIpcRequest<TKey extends IpcCommandKey> = z.infer<
  IpcCommandContract<TKey>["request"]
>;
export type IpcResponse<TKey extends IpcCommandKey> = z.infer<IpcCommandContract<TKey>["response"]>;

export const ipcCommandKeys = Object.keys(ipcCommandContracts) as IpcCommandKey[];
