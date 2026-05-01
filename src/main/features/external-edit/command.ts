import type { AppContext } from "@main/core/context";
import type { IpcRouter } from "@main/core/ipc/register-ipc";

import { cancelEdit, submitEdit } from "./service";

export function registerExternalEditCommands(ipc: IpcRouter): void {
  const getDeps = (ctx: AppContext) => ({
    manager: ctx.externalEditManager,
  });

  ipc.command("external-edit.cancel", async (input, ctx) => {
    await cancelEdit(getDeps(ctx), input.editId);
    return undefined;
  });

  ipc.command("external-edit.list", async (_input, ctx) => {
    return ctx.externalEditManager.listSessions();
  });

  ipc.command("external-edit.submit", async (input, ctx) => {
    return await submitEdit(getDeps(ctx), await ctx.getDb(), input.editId, input.content);
  });
}
