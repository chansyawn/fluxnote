export interface PlaceholderPayload {
  kind: string;
  markdown: string;
  metadata?: Record<string, unknown>;
}

export function createPlaceholderPayload(
  markdown: string,
  kind: string,
  metadata?: Record<string, unknown>,
): PlaceholderPayload {
  return {
    kind: kind || "unknown",
    markdown,
    ...(metadata ? { metadata } : {}),
  };
}
