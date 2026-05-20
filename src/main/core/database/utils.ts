export function nowIsoString(): string {
  return new Date().toISOString();
}

export function isSqliteUniqueConstraint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = (error as { cause?: unknown }).cause;
  const causeMessage = cause instanceof Error ? cause.message : "";

  return (
    error.message.includes("UNIQUE constraint failed") ||
    causeMessage.includes("UNIQUE constraint failed")
  );
}

export function getSqliteChangedRows(result: unknown): number {
  const changes = (result as { changes?: unknown }).changes;
  return typeof changes === "number" ? changes : 0;
}
