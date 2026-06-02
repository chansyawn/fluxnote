const APP_PLATFORMS = ["darwin", "win32", "unsupported"] as const;

export type AppPlatform = (typeof APP_PLATFORMS)[number];

export interface AppEnvironment {
  platform: AppPlatform;
}

export function normalizeAppPlatform(value: string): AppPlatform {
  return APP_PLATFORMS.find((platform) => platform === value) ?? "unsupported";
}
