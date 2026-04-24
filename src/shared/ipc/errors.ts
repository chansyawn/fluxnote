export interface IpcErrorPayload {
  type: "INTERNAL" | `BUSINESS.${string}`;
  message: string;
  details?: unknown;
}

export type IpcResult<TData> = { ok: true; data: TData } | { ok: false; error: IpcErrorPayload };

export class IpcAppError extends Error {
  readonly details?: unknown;
  readonly type: IpcErrorPayload["type"];

  constructor(payload: IpcErrorPayload) {
    super(payload.message);
    this.name = "IpcAppError";
    this.type = payload.type;
    this.details = payload.details;
  }
}

export function businessError(
  type: `BUSINESS.${string}`,
  message: string,
  details?: unknown,
): IpcAppError {
  return new IpcAppError({ details, message, type });
}

export function internalError(message: string, details?: unknown): IpcAppError {
  return new IpcAppError({ details, message, type: "INTERNAL" });
}

function isErrorPayload(value: unknown): value is IpcErrorPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.type === "string" && typeof payload.message === "string";
}

export function toIpcErrorPayload(error: unknown): IpcErrorPayload {
  if (error instanceof IpcAppError) {
    return {
      type: error.type,
      message: error.message,
      details: error.details,
    };
  }

  if (isErrorPayload(error)) {
    return {
      type: error.type,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      type: "INTERNAL",
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
      },
    };
  }

  return {
    type: "INTERNAL",
    message: "Unknown IPC error",
    details: error,
  };
}
