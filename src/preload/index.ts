import type { FluxnoteRuntime } from "@shared/electron-runtime";
import {
  ipcCommandContracts,
  ipcEventContracts,
  type IpcCommandKey,
  type IpcEventKey,
  type IpcEventPayload,
  type IpcRequest,
  type IpcResponse,
} from "@shared/ipc/contracts";
import type { IpcErrorPayload, IpcResult } from "@shared/ipc/errors";
import { contextBridge, ipcRenderer } from "electron";

const shouldLogInvalidEventPayload = process.env.NODE_ENV !== "production" && !process.env.VITEST;

function isIpcResult<TData>(value: unknown): value is IpcResult<TData> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;
  return result.ok === true || result.ok === false;
}

function invalidIpcError(message: string, details?: unknown): IpcErrorPayload {
  return {
    details,
    message,
    type: "INTERNAL",
  };
}

async function invoke<TKey extends IpcCommandKey>(
  key: TKey,
  payload: IpcRequest<TKey>,
): Promise<IpcResponse<TKey>> {
  const contract = ipcCommandContracts[key];
  const result = (await ipcRenderer.invoke(contract.channel, payload)) as unknown;
  if (!isIpcResult<IpcResponse<TKey>>(result)) {
    throw invalidIpcError("Invalid IPC result", { key, result });
  }

  if (!result.ok) {
    throw result.error;
  }

  const parsedResponse = contract.response.safeParse(result.data);
  if (!parsedResponse.success) {
    throw invalidIpcError("Invalid IPC response", {
      issues: parsedResponse.error.issues,
      key,
    });
  }

  return parsedResponse.data as IpcResponse<TKey>;
}

function subscribe<TKey extends IpcEventKey>(
  key: TKey,
  handler: (payload: IpcEventPayload<TKey>) => void,
): () => void {
  const contract = ipcEventContracts[key];
  const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => {
    const parsedPayload = contract.payload.safeParse(payload);
    if (!parsedPayload.success) {
      if (shouldLogInvalidEventPayload) {
        console.error(`Invalid IPC event payload for ${key}`, parsedPayload.error.issues);
      }
      return;
    }

    handler(parsedPayload.data as IpcEventPayload<TKey>);
  };

  ipcRenderer.on(contract.channel, listener);
  return () => {
    ipcRenderer.off(contract.channel, listener);
  };
}

const runtime: FluxnoteRuntime = {
  invoke,
  subscribe,
};

contextBridge.exposeInMainWorld("fluxnote", runtime);
