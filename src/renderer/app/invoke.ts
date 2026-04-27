import type { FluxnoteRuntime } from "@shared/electron-runtime";
import type {
  IpcCommandKey,
  IpcEventKey,
  IpcEventPayload,
  IpcRequest,
  IpcResponse,
} from "@shared/ipc/contracts";
import type { IpcErrorPayload } from "@shared/ipc/errors";

export type RuntimeBridge = FluxnoteRuntime;
export type AppInvokeErrorPayload = IpcErrorPayload;

export class AppInvokeError extends Error {
  readonly type: string;
  readonly details?: unknown;

  constructor(payload: AppInvokeErrorPayload) {
    super(payload.message);
    this.name = "AppInvokeError";
    this.type = payload.type;
    this.details = payload.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorPayload(value: unknown): value is AppInvokeErrorPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.type === "string" && typeof payload.message === "string";
}

export function toAppInvokeError(error: unknown): AppInvokeError {
  if (error instanceof AppInvokeError) {
    return error;
  }

  if (isErrorPayload(error)) {
    return new AppInvokeError({
      type: error.type,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof Error) {
    return new AppInvokeError({
      type: "INTERNAL",
      message: error.message,
    });
  }

  return new AppInvokeError({
    type: "INTERNAL",
    message: "Unknown invoke error",
    details: error,
  });
}

export function getRuntimeBridge(): RuntimeBridge {
  if (typeof window === "undefined") {
    throw new Error("Fluxnote runtime bridge is unavailable: window is undefined");
  }

  const runtimeValue = window.fluxnote;
  if (!isRecord(runtimeValue)) {
    throw new Error(
      "Fluxnote runtime bridge is unavailable: window.fluxnote is missing. Check preload bridge injection.",
    );
  }

  return runtimeValue as RuntimeBridge;
}

export async function invokeCommand<TKey extends IpcCommandKey>(
  key: TKey,
  payload: IpcRequest<TKey>,
): Promise<IpcResponse<TKey>> {
  try {
    return await getRuntimeBridge().invoke(key, payload);
  } catch (error) {
    throw toAppInvokeError(error);
  }
}

export function subscribeEvent<TKey extends IpcEventKey>(
  key: TKey,
  handler: (payload: IpcEventPayload<TKey>) => void,
): () => void {
  try {
    return getRuntimeBridge().subscribe(key, handler);
  } catch (error) {
    throw toAppInvokeError(error);
  }
}
