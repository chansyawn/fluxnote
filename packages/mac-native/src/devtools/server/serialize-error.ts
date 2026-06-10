import type { DevtoolsErrorPayload } from "../types";

interface ErrorWithCode extends Error {
  code?: unknown;
  details?: unknown;
}

export function serializeError(error: unknown): DevtoolsErrorPayload {
  if (error instanceof Error) {
    const codedError = error as ErrorWithCode;
    return {
      code: typeof codedError.code === "string" ? codedError.code : undefined,
      details: codedError.details,
      message: error.message,
      name: error.name,
    };
  }

  return {
    message: String(error),
    name: "UnknownError",
  };
}
