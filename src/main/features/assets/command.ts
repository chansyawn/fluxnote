import type { AppContext } from "@main/core/context";
import type { IpcRouter } from "@main/core/ipc/register-ipc";

import { copyAsset, createAsset } from "./service";

export function registerAssetsCommands(ipc: IpcRouter): void {
  const getDeps = (ctx: AppContext) => ({
    paths: ctx.persistence.paths,
  });

  ipc.command("assets.copy", async (input, ctx) => {
    return await copyAsset(getDeps(ctx), await ctx.getDb(), input);
  });

  ipc.command("assets.create", async (input, ctx) => {
    return await createAsset(getDeps(ctx), await ctx.getDb(), input);
  });
}
