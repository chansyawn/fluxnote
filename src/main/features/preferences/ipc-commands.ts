import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";

interface PreferencesCommandServices {
  readPreferences: () => Record<string, unknown>;
  writePreferences: (value: Record<string, unknown>) => void;
}

export function createPreferencesIpcCommands(
  services: PreferencesCommandServices,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "preferencesRead",
      handle() {
        return services.readPreferences();
      },
    }),
    defineIpcCommandDefinition({
      key: "preferencesWrite",
      handle(request) {
        services.writePreferences(request);
        return undefined;
      },
    }),
  ] as const;
}
