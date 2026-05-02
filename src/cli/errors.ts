import { FluxCliUsageError } from "./args";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const payload = error as Record<string, unknown>;
    if (typeof payload.message === "string") {
      return payload.message;
    }
  }

  return "Unknown CLI error.";
}

export function resolveExitCode(error: unknown): number {
  if (error instanceof FluxCliUsageError || (error instanceof Error && error.name === "CACError")) {
    return 2;
  }

  return 1;
}
