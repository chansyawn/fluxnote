import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";

interface PreferencesCommandServices {
  readPreferences: () => Record<string, unknown>;
  writePreferences: (value: Record<string, unknown>) => void;
}

export function createPreferencesCommandHandlers(
  services: PreferencesCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "preferencesRead",
      handle() {
        return services.readPreferences();
      },
    }),
    defineIpcCommandHandler({
      key: "preferencesWrite",
      handle(request) {
        services.writePreferences(request);
        return undefined;
      },
    }),
  ] as const;
}
