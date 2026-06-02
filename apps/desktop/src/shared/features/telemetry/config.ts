export interface PostHogConfigInput {
  host?: string;
  key?: string;
}

export interface PostHogProjectConfig {
  host: string;
  key: string;
}

function normalizeConfigValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function resolvePostHogProjectConfig(
  input: PostHogConfigInput,
): PostHogProjectConfig | null {
  const host = normalizeConfigValue(input.host);
  const key = normalizeConfigValue(input.key);

  if (!host || !key) {
    return null;
  }

  return { host, key };
}
