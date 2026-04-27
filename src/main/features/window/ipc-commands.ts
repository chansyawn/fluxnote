import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";

interface WindowCommandServices {
  hideMainWindow: () => void;
  requestQuit: () => void;
  toggleMainWindow: () => void;
}

export function createWindowIpcCommands(
  services: WindowCommandServices,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "windowHide",
      handle() {
        services.hideMainWindow();
        return undefined;
      },
    }),
    defineIpcCommandDefinition({
      key: "windowToggle",
      handle() {
        services.toggleMainWindow();
        return undefined;
      },
    }),
    defineIpcCommandDefinition({
      key: "windowDestroy",
      handle() {
        services.requestQuit();
        return undefined;
      },
    }),
  ] as const;
}
