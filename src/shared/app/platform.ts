const APP_PLATFORMS = ["darwin", "win32", "unsupported"] as const;

export type AppPlatform = (typeof APP_PLATFORMS)[number];

export interface AppEnvironment {
  platform: AppPlatform;
}

export function normalizeAppPlatform(value: string): AppPlatform {
  const platform = APP_PLATFORMS.find((candidate) => candidate === value);

  return platform ?? "unsupported";
}
