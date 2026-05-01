import type { IpcRouter } from "@main/core/ipc/register-ipc";

import { createAssetService } from "./service";

export function registerAssetsCommands(ipc: IpcRouter): void {
  ipc.command("assets.copy", async (input, ctx) => {
    const service = createAssetService({ store: ctx.store });
    return await service.copyAsset(await ctx.getDb(), input);
  });

  ipc.command("assets.create", async (input, ctx) => {
    const service = createAssetService({ store: ctx.store });
    return await service.createAsset(await ctx.getDb(), input);
  });
}
