import type {
  UserPreferences,
  UserPreferencesPatch,
} from "@shared/features/preferences/user-preferences";

import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export async function readUserPreferences(): Promise<UserPreferences> {
  return await invokeCommand("preferences.read", undefined);
}

export async function patchUserPreferences(patch: UserPreferencesPatch): Promise<UserPreferences> {
  return await invokeCommand("preferences.patch", patch);
}

export async function resetUserPreferences(): Promise<UserPreferences> {
  return await invokeCommand("preferences.reset", undefined);
}

export function onPreferencesChanged(handler: (preferences: UserPreferences) => void): () => void {
  return subscribeEvent("preferences.changed", handler);
}
