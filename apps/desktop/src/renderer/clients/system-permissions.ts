import {
  systemPermissionsContract,
  type SystemPermissionRequest,
  type SystemPermissionStatus,
} from "@shared/features/system-permissions/contract";
import type { z } from "zod";

import { invokeCommand } from "./ipc/invoke";

export type { SystemPermissionRequest, SystemPermissionStatus };

export type SystemPermissionOpenSettingsRequest = z.input<
  (typeof systemPermissionsContract)["commands"]["system-permissions.open-settings"]["input"]
>;

export const getSystemPermissionStatus = (
  request: SystemPermissionRequest,
): Promise<SystemPermissionStatus> => invokeCommand("system-permissions.get", request);

export const requestSystemPermission = (
  request: SystemPermissionRequest,
): Promise<SystemPermissionStatus> => invokeCommand("system-permissions.request", request);

export const openSystemPermissionSettings = (
  request: SystemPermissionOpenSettingsRequest,
): Promise<void> => invokeCommand("system-permissions.open-settings", request);
