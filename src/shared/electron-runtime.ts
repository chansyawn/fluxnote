import type {
  IpcCommandKey,
  IpcEventKey,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
} from "@shared/ipc/contracts";

export interface FluxnoteRuntime {
  invoke<TKey extends IpcCommandKey>(
    key: TKey,
    payload: IpcRequest<TKey>,
  ): Promise<IpcResponse<TKey>>;
  subscribe<TKey extends IpcEventKey>(
    key: TKey,
    handler: (payload: IpcEventPayload<TKey>) => void,
  ): () => void;
}

export interface FluxnoteRuntimeGlobal {
  fluxnote?: FluxnoteRuntime;
}

declare global {
  interface Window extends FluxnoteRuntimeGlobal {}
}
