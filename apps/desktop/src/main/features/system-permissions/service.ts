import { createMacAccessibilityNative, type MacAccessibilityNative } from "@fluxnotes/mac-native";
import type {
  SystemPermission,
  SystemPermissionStatus,
} from "@shared/features/system-permissions/contract";
import { shell } from "electron";

const MACOS_ACCESSIBILITY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

interface SystemPermissionsServiceDeps {
  macAccessibility: Pick<MacAccessibilityNative, "isAccessibilityTrusted" | "isSupported">;
  openExternal: (url: string) => Promise<void>;
}

export interface SystemPermissionsService {
  getStatus: (permission: SystemPermission) => SystemPermissionStatus;
  openSettings: (permission: SystemPermission) => Promise<void>;
  request: (permission: SystemPermission) => SystemPermissionStatus;
}

function unsupportedStatus(permission: SystemPermission): SystemPermissionStatus {
  return {
    granted: false,
    permission,
    supported: false,
  };
}

export function createSystemPermissionsService(
  deps: SystemPermissionsServiceDeps,
): SystemPermissionsService {
  function getStatus(permission: SystemPermission): SystemPermissionStatus {
    if (!deps.macAccessibility.isSupported()) {
      return unsupportedStatus(permission);
    }

    return {
      granted: deps.macAccessibility.isAccessibilityTrusted(false),
      permission,
      supported: true,
    };
  }

  function request(permission: SystemPermission): SystemPermissionStatus {
    if (!deps.macAccessibility.isSupported()) {
      return unsupportedStatus(permission);
    }

    return {
      granted: deps.macAccessibility.isAccessibilityTrusted(true),
      permission,
      supported: true,
    };
  }

  async function openSettings(permission: SystemPermission): Promise<void> {
    if (!deps.macAccessibility.isSupported()) {
      return;
    }

    switch (permission) {
      case "macos_accessibility":
        await deps.openExternal(MACOS_ACCESSIBILITY_SETTINGS_URL);
        return;
    }
  }

  return {
    getStatus,
    openSettings,
    request,
  };
}

export function createDefaultSystemPermissionsService(): SystemPermissionsService {
  return createSystemPermissionsService({
    macAccessibility: createMacAccessibilityNative(),
    openExternal: (url) => shell.openExternal(url),
  });
}
