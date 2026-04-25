import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import type { PendingDeepLink } from "./deep-link-handler";

interface DeepLinkCommandServices {
  acknowledgePending: (blockId: string) => void;
  readPending: () => PendingDeepLink;
}

export function createDeepLinkCommandHandlers(
  services: DeepLinkCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "deepLinkPendingRead",
      handle() {
        return services.readPending();
      },
    }),
    defineIpcCommandHandler({
      key: "deepLinkPendingAcknowledge",
      handle(request) {
        services.acknowledgePending(request.blockId);
        return undefined;
      },
    }),
  ] as const;
}
