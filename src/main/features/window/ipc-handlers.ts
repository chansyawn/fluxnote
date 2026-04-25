import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";

interface WindowCommandServices {
  hideMainWindow: () => void;
  requestQuit: () => void;
  toggleMainWindow: () => void;
}

export function createWindowCommandHandlers(
  services: WindowCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "windowHide",
      handle() {
        services.hideMainWindow();
        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "windowToggle",
      handle() {
        services.toggleMainWindow();
        return undefined;
      },
    }),
    defineIpcCommandHandler({
      key: "windowDestroy",
      handle() {
        services.requestQuit();
        return undefined;
      },
    }),
  ] as const;
}
