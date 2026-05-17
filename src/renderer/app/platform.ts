import type { AppPlatform } from "@shared/app/platform";

export function getAppPlatform(): AppPlatform {
  return window.appEnvironment.platform;
}
