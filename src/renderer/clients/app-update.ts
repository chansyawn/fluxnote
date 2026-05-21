import type { AppUpdateCheckRequest, AppUpdateStatus } from "@shared/features/app-update/contract";

import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export async function getAppUpdateStatus(): Promise<AppUpdateStatus> {
  return await invokeCommand("app-update.get-status", undefined);
}

export async function checkForAppUpdate(request: AppUpdateCheckRequest): Promise<AppUpdateStatus> {
  return await invokeCommand("app-update.check", request);
}

export async function restartAndInstallAppUpdate(): Promise<void> {
  await invokeCommand("app-update.restart-and-install", undefined);
}

export function onAppUpdateChanged(handler: (status: AppUpdateStatus) => void): () => void {
  return subscribeEvent("app-update.changed", handler);
}

export type { AppUpdateStatus };
