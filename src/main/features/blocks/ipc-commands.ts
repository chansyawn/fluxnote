import type { AppDatabase } from "@main/core/database/database-client";
import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import type { BackendStore } from "@main/core/persistence/backend-store";
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

interface BlocksCommandServices {
  getDb: () => Promise<AppDatabase>;
  getProtectedBlockIds?: () => ReadonlySet<string>;
  now?: () => Date;
  readAutoArchiveSettings?: () => AutoArchiveSettings | Promise<AutoArchiveSettings>;
  store: BackendStore;
}

export function createBlocksIpcCommands(
  services: BlocksCommandServices,
): readonly AnyIpcCommandDefinition[] {
  async function getAutoArchiveEvaluationContext(): Promise<AutoArchiveEvaluationContext> {
    let settings = DEFAULT_SETTINGS.autoArchive;
    try {
      settings = services.readAutoArchiveSettings
        ? await services.readAutoArchiveSettings()
        : DEFAULT_SETTINGS.autoArchive;
    } catch {
      settings = DEFAULT_SETTINGS.autoArchive;
    }

    return createAutoArchiveEvaluationContext({
      now: services.now?.() ?? new Date(),
      protectedBlockIds: services.getProtectedBlockIds?.() ?? new Set<string>(),
      settings,
    });
  }

  return [
    defineIpcCommandDefinition({
      key: "blocksList",
      async handle(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await listBlocks(
          await services.getDb(),
          request.tagIds,
          request.visibility,
          request.offset,
          request.limit,
          autoArchiveContext,
        );
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksLocate",
      async handle(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await locateBlock(
          await services.getDb(),
          request.blockId,
          request.tagIds,
          request.visibility,
          autoArchiveContext,
        );
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksCreate",
      async handle() {
        return await createBlockRecord(await services.getDb());
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksUpdateContent",
      async handle(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await updateBlockContent(
          await services.getDb(),
          request.blockId,
          request.content,
          autoArchiveContext,
        );
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksDelete",
      async handle(request) {
        return deleteBlock(
          await services.getDb(),
          request.blockId,
          services.store.getAssetPathForBlock(request.blockId),
        );
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksArchive",
      async handle(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await archiveBlock(await services.getDb(), request.blockId, autoArchiveContext);
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksRestore",
      async handle(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await restoreBlock(await services.getDb(), request.blockId, autoArchiveContext);
      },
    }),
  ] as const;
}
