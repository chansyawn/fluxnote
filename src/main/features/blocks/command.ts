import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";
import type { ExternalEditSession } from "@shared/features/external-edit/session-contracts";
import type { AutoArchiveSettings } from "@shared/features/preferences/settings";

import {
  createAutoArchiveEvaluationContext,
  resolveAutoArchiveSettings,
  type AutoArchiveEvaluationContext,
} from "./auto-archive-policy";
import {
  archiveBlock,
  createBlockRecord,
  deleteBlock,
  listBlocks,
  locateBlock,
  restoreBlock,
  setBlockKeepState,
  updateBlockContent,
} from "./service";

interface BlocksCommandDeps {
  db: AppDatabase;
  readAutoArchiveSettings: () => AutoArchiveSettings | Promise<AutoArchiveSettings>;
  listExternalEditSessions: () => ExternalEditSession[];
  getAssetPathForBlock: (blockId: string) => string;
  now: () => Date;
}

async function getAutoArchiveEvaluationContext(
  deps: BlocksCommandDeps,
): Promise<AutoArchiveEvaluationContext> {
  const settings = await resolveAutoArchiveSettings(deps.readAutoArchiveSettings);

  return createAutoArchiveEvaluationContext({
    now: deps.now(),
    protectedBlockIds: new Set(deps.listExternalEditSessions().map((session) => session.blockId)),
    settings,
  });
}

export function registerBlocksCommands(ipc: IpcRouter, deps: BlocksCommandDeps): void {
  ipc.command("blocks.archive", async (input) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(deps);
    return await archiveBlock(deps.db, input.blockId, autoArchiveContext);
  });

  ipc.command("blocks.create", async () => {
    return await createBlockRecord(deps.db);
  });

  ipc.command("blocks.delete", async (input) => {
    return await deleteBlock(deps.db, input.blockId, deps.getAssetPathForBlock(input.blockId));
  });

  ipc.command("blocks.list", async (input) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(deps);
    return await listBlocks(
      deps.db,
      input.tagIds,
      input.visibility ?? "active",
      input.offset,
      input.limit,
      autoArchiveContext,
    );
  });

  ipc.command("blocks.locate", async (input) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(deps);
    return await locateBlock(
      deps.db,
      input.blockId,
      input.tagIds,
      input.visibility ?? "active",
      autoArchiveContext,
    );
  });

  ipc.command("blocks.restore", async (input) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(deps);
    return await restoreBlock(deps.db, input.blockId, autoArchiveContext);
  });

  ipc.command("blocks.set-keep-state", async (input) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(deps);
    return await setBlockKeepState(deps.db, input.blockId, input.isKept, autoArchiveContext);
  });

  ipc.command("blocks.update-content", async (input) => {
    const autoArchiveContext = await getAutoArchiveEvaluationContext(deps);
    return await updateBlockContent(deps.db, input.blockId, input.content, autoArchiveContext);
  });
}
