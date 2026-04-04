import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export interface AppInvokeErrorPayload {
  type: string;
  message: string;
  details?: unknown;
}

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

function toPayload(value: unknown): AppInvokeErrorPayload {
  if (isRecord(value) && typeof value.type === "string" && typeof value.message === "string") {
    return {
      type: value.type,
      message: value.message,
      details: value.details,
    };
  }

  if (typeof value === "string") {
    try {
      return toPayload(JSON.parse(value) as unknown);
    } catch {
      return { type: "INTERNAL", message: value };
    }
  }

  if (value instanceof Error && value.message) {
    return toPayload(value.message);
  }

  return { type: "INTERNAL", message: "Unknown invoke error", details: value };
}

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(command, args);
  } catch (error: unknown) {
    throw new AppInvokeError(toPayload(error));
  }
}
