import { createFeatureClient } from "@renderer/app/ipc-client";
import { preferencesApi, type Settings, type SettingsPatch } from "@shared/features/preferences";

const preferencesClient = createFeatureClient(preferencesApi);

export async function readSettings(): Promise<Settings> {
  return await preferencesClient.commands.read(undefined);
}

export async function patchSettings(patch: SettingsPatch): Promise<Settings> {
  return await preferencesClient.commands.patch(patch);
}

export async function resetSettings(): Promise<Settings> {
  return await preferencesClient.commands.reset(undefined);
}
