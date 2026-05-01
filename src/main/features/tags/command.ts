import type { IpcRouter } from "@main/core/ipc/register-ipc";

import { createTag, deleteTag, listTags, setBlockTags } from "./service";

export function registerTagsCommands(ipc: IpcRouter): void {
  ipc.command("tags.create", async (input, ctx) => {
    return await createTag(await ctx.getDb(), input.name);
  });

  ipc.command("tags.delete", async (input, ctx) => {
    await deleteTag(await ctx.getDb(), input.tagId);
    return undefined;
  });

  ipc.command("tags.list", async (_input, ctx) => {
    return await listTags(await ctx.getDb());
  });

  ipc.command("tags.setBlockTags", async (input, ctx) => {
    return await setBlockTags(await ctx.getDb(), input.blockId, input.tagIds);
  });
}
