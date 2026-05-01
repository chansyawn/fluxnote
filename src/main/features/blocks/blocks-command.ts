import type { AppContext } from "@main/app-context";
import type { IpcRouter } from "@main/core/ipc/register-ipc";
import { DEFAULT_SETTINGS, type AutoArchiveSettings } from "@shared/features/preferences";

import {
  createAutoArchiveEvaluationContext,
  type AutoArchiveEvaluationContext,
} from "./auto-archive-policy";
import {
  archiveBlock,
  createBlockRecord,
  deleteBlock,
  listBlocks,
  locateBlock,
  restoreBlock,
  updateBlockContent,
} from "./service";

async function getAutoArchiveEvaluationContext(
  ctx: AppContext,
): Promise<AutoArchiveEvaluationContext> {
  const settings = await (async (): Promise<AutoArchiveSettings> => {
    try {
      return await Promise.resolve(ctx.preferencesService.readAutoArchiveSettings());
    } catch {
      return DEFAULT_SETTINGS.autoArchive;
    }
  })();

  return createAutoArchiveEvaluationContext({
    now: ctx.now(),
    protectedBlockIds: new Set(
      ctx.externalEditManager.listSessions().map((session) => session.blockId),
    ),
    settings,
  });
}

export function registerBlocksCommands(ipc: IpcRouter): void {
  ipc.command("blocks.archive", async (input, ctx) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(ctx);
    return await archiveBlock(await ctx.getDb(), input.blockId, autoArchiveContext);
  });

  ipc.command("blocks.create", async (_input, ctx) => {
    return await createBlockRecord(await ctx.getDb());
  });

  ipc.command("blocks.delete", async (input, ctx) => {
    return await deleteBlock(
      await ctx.getDb(),
      input.blockId,
      ctx.store.getAssetPathForBlock(input.blockId),
    );
  });

  ipc.command("blocks.list", async (input, ctx) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(ctx);
    return await listBlocks(
      await ctx.getDb(),
      input.tagIds,
      input.visibility ?? "active",
      input.offset,
      input.limit,
      autoArchiveContext,
    );
  });

  ipc.command("blocks.locate", async (input, ctx) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(ctx);
    return await locateBlock(
      await ctx.getDb(),
      input.blockId,
      input.tagIds,
      input.visibility ?? "active",
      autoArchiveContext,
    );
  });

  ipc.command("blocks.restore", async (input, ctx) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(ctx);
    return await restoreBlock(await ctx.getDb(), input.blockId, autoArchiveContext);
  });

  ipc.command("blocks.updateContent", async (input, ctx) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(ctx);
    return await updateBlockContent(
      await ctx.getDb(),
      input.blockId,
      input.content,
      autoArchiveContext,
    );
  });
}
