import { z } from "zod";

import { blocksIpcEventContracts } from "../../domains/blocks/ipc-events";
import { externalEditIpcEventContracts } from "../../domains/external-edit/ipc-events";
import { openBlockIpcEventContracts } from "../../domains/open-block/ipc-events";
import { shortcutIpcEventContracts } from "../../domains/shortcut/ipc-events";
import { windowIpcEventContracts } from "../../domains/window/ipc-events";

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
