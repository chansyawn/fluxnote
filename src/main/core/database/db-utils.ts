export function nowIsoString(): string {
  return new Date().toISOString();
}

export function isSqliteUniqueConstraint(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("UNIQUE constraint failed");
}
