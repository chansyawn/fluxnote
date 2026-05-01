import type { IpcRouter } from "@main/core/ipc/register-ipc";

export function registerOpenBlockCommands(ipc: IpcRouter): void {
  ipc.command("openBlock.acknowledgePending", (input, ctx) => {
    ctx.openBlockService.acknowledgePending(input.blockId);
    return undefined;
  });

  ipc.command("openBlock.readPending", (_input, ctx) => {
    return ctx.openBlockService.readPending();
  });
}
