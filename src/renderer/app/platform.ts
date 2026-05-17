import { normalizeAppPlatform, type AppPlatform } from "@shared/app/platform";

export function getAppPlatform(): AppPlatform {
  if (typeof window === "undefined") {
    return "linux";
  }

  return normalizeAppPlatform(window.appEnvironment?.platform ?? "linux");
}

export function applyAppPlatformAttribute(): void {
  document.documentElement.dataset.platform = getAppPlatform();
}
