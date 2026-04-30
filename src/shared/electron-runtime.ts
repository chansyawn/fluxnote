import type {
  IpcCommandKey,
  IpcEventKey,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
} from "@shared/ipc/contracts";

export interface FluxnotesRuntime {
  invoke<TKey extends IpcCommandKey>(
    key: TKey,
    payload: IpcRequest<TKey>,
  ): Promise<IpcResponse<TKey>>;
  subscribe<TKey extends IpcEventKey>(
    key: TKey,
    handler: (payload: IpcEventPayload<TKey>) => void,
  ): () => void;
}

export interface FluxnotesRuntimeGlobal {
  fluxnotes?: FluxnotesRuntime;
}

declare global {
  interface Window extends FluxnotesRuntimeGlobal {}
}
