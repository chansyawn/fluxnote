import type { AppPlatform } from "@shared/app/platform";

export function getAppPlatform(): AppPlatform {
  return window.appEnvironment.platform;
}

export function applyAppPlatformAttribute(): void {
  document.documentElement.dataset.platform = getAppPlatform();
}
