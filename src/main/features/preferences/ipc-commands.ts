import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import type { PreferencesService } from "@main/features/preferences/service";

export function createPreferencesIpcCommands(
  service: PreferencesService,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "preferencesRead",
      handle() {
        return service.readSettings();
      },
    }),
    defineIpcCommandDefinition({
      key: "preferencesPatch",
      handle(request) {
        return service.patchSettings(request);
      },
    }),
    defineIpcCommandDefinition({
      key: "preferencesReset",
      handle() {
        return service.resetSettings();
      },
    }),
  ] as const;
}
