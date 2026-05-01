import type { IpcRouter } from "@main/core/ipc/register-ipc";

import { createExternalEditService } from "./service";

export function registerExternalEditCommands(ipc: IpcRouter): void {
  ipc.command("external-edit.cancel", async (input, ctx) => {
    const service = createExternalEditService({ manager: ctx.externalEditManager });
    await service.cancelEdit(input.editId);
    return undefined;
  });

  ipc.command("external-edit.list", async (_input, ctx) => {
    return ctx.externalEditManager.listSessions();
  });

  ipc.command("external-edit.submit", async (input, ctx) => {
    const service = createExternalEditService({ manager: ctx.externalEditManager });
    return await service.submitEdit(await ctx.getDb(), input.editId, input.content);
  });
}
