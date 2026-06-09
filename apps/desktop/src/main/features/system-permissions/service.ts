import type {
  SystemPermission,
  SystemPermissionStatus,
} from "@shared/features/system-permissions/contract";
import { shell, systemPreferences } from "electron";

const MACOS_ACCESSIBILITY_SETTINGS_URL =
  "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

interface SystemPermissionsServiceDeps {
  isMac: () => boolean;
  isTrustedAccessibilityClient: (prompt: boolean) => boolean;
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
    if (!deps.isMac()) {
      return unsupportedStatus(permission);
    }

    return {
      granted: deps.isTrustedAccessibilityClient(false),
      permission,
      supported: true,
    };
  }

  function request(permission: SystemPermission): SystemPermissionStatus {
    if (!deps.isMac()) {
      return unsupportedStatus(permission);
    }

    return {
      granted: deps.isTrustedAccessibilityClient(true),
      permission,
      supported: true,
    };
  }

  async function openSettings(permission: SystemPermission): Promise<void> {
    if (!deps.isMac()) {
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
    isMac: () => process.platform === "darwin",
    isTrustedAccessibilityClient: (prompt) =>
      systemPreferences.isTrustedAccessibilityClient(prompt),
    openExternal: (url) => shell.openExternal(url),
  });
}
