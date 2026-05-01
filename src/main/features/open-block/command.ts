import type { IpcRouter } from "@main/core/ipc/register-ipc";

export function registerOpenBlockCommands(ipc: IpcRouter): void {
  ipc.command("open-block.acknowledge-pending", (input, ctx) => {
    ctx.openBlockService.acknowledgePending(input.blockId);
    return undefined;
  });

  ipc.command("open-block.read-pending", (_input, ctx) => {
    return ctx.openBlockService.readPending();
  });
}
