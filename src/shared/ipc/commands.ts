import { z } from "zod";

import { assetsIpcCommandContracts } from "../features/assets/ipc-commands";
import { blocksIpcCommandContracts } from "../features/blocks/ipc-commands";
import { cliIpcCommandContracts } from "../features/cli/ipc-commands";
import { externalEditIpcCommandContracts } from "../features/external-edit/ipc-commands";
import { openBlockIpcCommandContracts } from "../features/open-block/ipc-commands";
import { preferencesIpcCommandContracts } from "../features/preferences/ipc-commands";
import { sampleIpcCommandContracts } from "../features/sample/ipc-commands";
import { shortcutIpcCommandContracts } from "../features/shortcut/ipc-commands";
import { tagsIpcCommandContracts } from "../features/tags/ipc-commands";
import { windowIpcCommandContracts } from "../features/window/ipc-commands";

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
