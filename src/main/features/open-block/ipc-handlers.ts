import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import type { PendingOpenBlockRequest } from "./open-block-handler";

interface OpenBlockCommandServices {
  acknowledgePending: (blockId: string) => void;
  readPending: () => PendingOpenBlockRequest;
}

export function createOpenBlockCommandHandlers(
  services: OpenBlockCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "openBlockPendingRead",
      handle() {
        return services.readPending();
      },
    }),
    defineIpcCommandHandler({
      key: "openBlockPendingAcknowledge",
      handle(request) {
        services.acknowledgePending(request.blockId);
        return undefined;
      },
    }),
  ] as const;
}
