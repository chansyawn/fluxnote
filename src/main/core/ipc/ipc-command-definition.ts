import type { IpcCommandKey, IpcResponse, ParsedIpcRequest } from "@shared/ipc/contracts";
import type { IpcMainInvokeEvent } from "electron";

export interface IpcCommandDefinition<TKey extends IpcCommandKey> {
  key: TKey;
  handle: (
    request: ParsedIpcRequest<TKey>,
    event: IpcMainInvokeEvent,
  ) => Promise<IpcResponse<TKey>> | IpcResponse<TKey>;
}

export type AnyIpcCommandDefinition = {
  [TKey in IpcCommandKey]: IpcCommandDefinition<TKey>;
}[IpcCommandKey];

export function defineIpcCommandDefinition<TKey extends IpcCommandKey>(
  definition: IpcCommandDefinition<TKey>,
): IpcCommandDefinition<TKey> {
  return definition;
}
