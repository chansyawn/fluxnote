import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";

import type { PendingOpenBlockRequest } from "./service";

interface OpenBlockCommandServices {
  acknowledgePending: (blockId: string) => void;
  readPending: () => PendingOpenBlockRequest;
}

export function createOpenBlockIpcCommands(
  services: OpenBlockCommandServices,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "openBlockPendingRead",
      handle() {
        return services.readPending();
      },
    }),
    defineIpcCommandDefinition({
      key: "openBlockPendingAcknowledge",
      handle(request) {
        services.acknowledgePending(request.blockId);
        return undefined;
      },
    }),
  ] as const;
}
