import type { IpcCommandKey, IpcResponse, ParsedIpcRequest } from "@shared/ipc/contracts";
import type { IpcMainInvokeEvent } from "electron";

export interface IpcCommandHandlerDefinition<TKey extends IpcCommandKey> {
  key: TKey;
  handle: (
    request: ParsedIpcRequest<TKey>,
    event: IpcMainInvokeEvent,
  ) => Promise<IpcResponse<TKey>> | IpcResponse<TKey>;
}

export type AnyIpcCommandHandlerDefinition = {
  [TKey in IpcCommandKey]: IpcCommandHandlerDefinition<TKey>;
}[IpcCommandKey];

export function defineIpcCommandHandler<TKey extends IpcCommandKey>(
  definition: IpcCommandHandlerDefinition<TKey>,
): IpcCommandHandlerDefinition<TKey> {
  return definition;
}
