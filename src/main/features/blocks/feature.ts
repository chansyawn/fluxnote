import type { AppDatabase } from "@main/core/database/database-client";
import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import type { BackendStore } from "@main/core/persistence/backend-store";
import { blocksApi } from "@shared/features/blocks";
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

interface BlocksServices {
  getDb: () => Promise<AppDatabase>;
  getProtectedBlockIds?: () => ReadonlySet<string>;
  now?: () => Date;
  readAutoArchiveSettings?: () => AutoArchiveSettings | Promise<AutoArchiveSettings>;
  store: BackendStore;
}

export function createBlocksFeature(services: BlocksServices) {
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

  return defineBackendFeature(blocksApi, {
    commands: {
      async archive(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await archiveBlock(await services.getDb(), request.blockId, autoArchiveContext);
      },
      async create() {
        return await createBlockRecord(await services.getDb());
      },
      async delete(request) {
        return deleteBlock(
          await services.getDb(),
          request.blockId,
          services.store.getAssetPathForBlock(request.blockId),
        );
      },
      async list(request) {
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
      async locate(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await locateBlock(
          await services.getDb(),
          request.blockId,
          request.tagIds,
          request.visibility,
          autoArchiveContext,
        );
      },
      async restore(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await restoreBlock(await services.getDb(), request.blockId, autoArchiveContext);
      },
      async updateContent(request) {
        const autoArchiveContext = await getAutoArchiveEvaluationContext();
        return await updateBlockContent(
          await services.getDb(),
          request.blockId,
          request.content,
          autoArchiveContext,
        );
      },
    },
  });
}
