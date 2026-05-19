import type { Settings, SettingsPatch } from "@shared/features/preferences/settings";

import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export async function readSettings(): Promise<Settings> {
  return await invokeCommand("preferences.read", undefined);
}

export async function patchSettings(patch: SettingsPatch): Promise<Settings> {
  return await invokeCommand("preferences.patch", patch);
}

export async function resetSettings(): Promise<Settings> {
  return await invokeCommand("preferences.reset", undefined);
}

export function onPreferencesChanged(handler: (settings: Settings) => void): () => void {
  return subscribeEvent("preferences.changed", handler);
}
