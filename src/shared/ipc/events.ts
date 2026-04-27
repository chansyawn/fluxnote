import { z } from "zod";

import { blocksIpcEventContracts } from "../features/blocks/ipc-events";
import { externalEditIpcEventContracts } from "../features/external-edit/ipc-events";
import { openBlockIpcEventContracts } from "../features/open-block/ipc-events";
import { shortcutIpcEventContracts } from "../features/shortcut/ipc-events";
import { windowIpcEventContracts } from "../features/window/ipc-events";

export const ipcEventContracts = {
  ...blocksIpcEventContracts,
  ...externalEditIpcEventContracts,
  ...openBlockIpcEventContracts,
  ...shortcutIpcEventContracts,
  ...windowIpcEventContracts,
} as const;

export type IpcEventKey = keyof typeof ipcEventContracts;
export type IpcEventContract<TKey extends IpcEventKey = IpcEventKey> =
  (typeof ipcEventContracts)[TKey];
export type IpcEventPayload<TKey extends IpcEventKey> = z.infer<IpcEventContract<TKey>["payload"]>;

export const ipcEventKeys = Object.keys(ipcEventContracts) as IpcEventKey[];
