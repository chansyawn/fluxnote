import type { IpcErrorPayload } from "@shared/ipc/result";
import type {
  CommandInput,
  CommandName,
  CommandOutput,
  EventName,
  EventPayload,
} from "@shared/ipc/types";

export class AppInvokeError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(payload: IpcErrorPayload) {
    super(payload.message);
    this.name = "AppInvokeError";
    this.code = payload.code;
    this.details = payload.details;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isErrorPayload(value: unknown): value is IpcErrorPayload {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === "string" && typeof value.message === "string";
}

export function toAppInvokeError(error: unknown): AppInvokeError {
  if (error instanceof AppInvokeError) {
    return error;
  }

  if (isErrorPayload(error)) {
    return new AppInvokeError(error);
  }

  if (error instanceof Error) {
    return new AppInvokeError({
      code: "INTERNAL",
      message: error.message,
    });
  }

  return new AppInvokeError({
    code: "INTERNAL",
    message: "Unknown invoke error",
    details: error,
  });
}

function getIpcBridge() {
  if (typeof window === "undefined" || !window.ipc) {
    throw new Error("Renderer IPC bridge is unavailable: window.ipc is missing.");
  }

  return window.ipc;
}

export async function invokeCommand<T extends CommandName>(
  name: T,
  input: CommandInput<T>,
): Promise<CommandOutput<T>> {
  try {
    return await getIpcBridge().command(name, input);
  } catch (error) {
    throw toAppInvokeError(error);
  }
}

export function subscribeEvent<T extends EventName>(
  name: T,
  listener: (payload: EventPayload<T>) => void,
): () => void {
  try {
    return getIpcBridge().on(name, listener);
  } catch (error) {
    throw toAppInvokeError(error);
  }
}
