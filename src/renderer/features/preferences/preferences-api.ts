import { invokeCommand } from "@renderer/ipc-client";
import type { Settings, SettingsPatch } from "@shared/features/preferences";

export async function readSettings(): Promise<Settings> {
  return await invokeCommand("preferences.read", undefined);
}

export async function patchSettings(patch: SettingsPatch): Promise<Settings> {
  return await invokeCommand("preferences.patch", patch);
}

export async function resetSettings(): Promise<Settings> {
  return await invokeCommand("preferences.reset", undefined);
}
