export interface IpcErrorPayload {
  code: "INTERNAL" | `BUSINESS.${string}`;
  message: string;
  details?: unknown;
}

export type IpcResult<TData> = { ok: true; data: TData } | { ok: false; error: IpcErrorPayload };

export class IpcAppError extends Error {
  readonly code: IpcErrorPayload["code"];
  readonly details?: unknown;

  constructor(payload: IpcErrorPayload) {
    super(payload.message);
    this.name = "IpcAppError";
    this.code = payload.code;
    this.details = payload.details;
  }
}

export function businessError(
  code: `BUSINESS.${string}`,
  message: string,
  details?: unknown,
): IpcAppError {
  return new IpcAppError({ code, details, message });
}

export function internalError(message: string, details?: unknown): IpcAppError {
  return new IpcAppError({ code: "INTERNAL", details, message });
}

function isErrorPayload(value: unknown): value is IpcErrorPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.code === "string" && typeof payload.message === "string";
}

export function toIpcErrorPayload(error: unknown): IpcErrorPayload {
  if (error instanceof IpcAppError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
    };
  }

  if (isErrorPayload(error)) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL",
      message: error.message,
      details: {
        name: error.name,
        stack: error.stack,
      },
    };
  }

  return {
    code: "INTERNAL",
    message: "Unknown IPC error",
    details: error,
  };
}
