export function normalizeKnownValue<T extends string>(
  value: string,
  knownValues: readonly T[],
  fallback: T,
): T {
  return knownValues.find((knownValue) => knownValue === value) ?? fallback;
}
