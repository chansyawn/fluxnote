import type { IpcRouter } from "@main/core/ipc/register-ipc";

import type { OpenBlockService } from "./service";

interface OpenBlockCommandDeps {
  openBlockService: OpenBlockService;
}

export function registerOpenBlockCommands(ipc: IpcRouter, deps: OpenBlockCommandDeps): void {
  ipc.command("open-block.acknowledge-pending", (input) => {
    deps.openBlockService.acknowledgePending(input.blockId);
    return undefined;
  });

  ipc.command("open-block.read-pending", () => {
    return deps.openBlockService.readPending();
  });
}
