const APP_PLATFORMS = [
  "aix",
  "android",
  "darwin",
  "freebsd",
  "haiku",
  "linux",
  "openbsd",
  "sunos",
  "win32",
  "cygwin",
  "netbsd",
] as const;

export type AppPlatform = (typeof APP_PLATFORMS)[number];

export interface AppEnvironment {
  platform: AppPlatform;
}

export function normalizeAppPlatform(value: string): AppPlatform {
  const platform = APP_PLATFORMS.find((candidate) => candidate === value);

  return platform ?? "linux";
}
