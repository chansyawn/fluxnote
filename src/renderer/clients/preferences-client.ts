import { invokeCommand } from "@renderer/app/invoke";
import type { Settings, SettingsPatch } from "@shared/features/preferences";

export async function readSettings(): Promise<Settings> {
  return await invokeCommand("preferencesRead", undefined);
}

export async function patchSettings(patch: SettingsPatch): Promise<Settings> {
  return await invokeCommand("preferencesPatch", patch);
}

export async function resetSettings(): Promise<Settings> {
  return await invokeCommand("preferencesReset", undefined);
}
