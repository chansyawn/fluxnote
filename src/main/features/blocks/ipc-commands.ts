import type { AppDatabase } from "@main/core/database/database-client";
import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";
import type { BackendStore } from "@main/core/persistence/backend-store";

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
  store: BackendStore;
}

export function createBlocksIpcCommands(
  services: BlocksCommandServices,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "blocksList",
      async handle(request) {
        return await listBlocks(
          await services.getDb(),
          request.tagIds,
          request.visibility,
          request.offset,
          request.limit,
        );
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksLocate",
      async handle(request) {
        return await locateBlock(
          await services.getDb(),
          request.blockId,
          request.tagIds,
          request.visibility,
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
        return await updateBlockContent(await services.getDb(), request.blockId, request.content);
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
        return await archiveBlock(await services.getDb(), request.blockId);
      },
    }),
    defineIpcCommandDefinition({
      key: "blocksRestore",
      async handle(request) {
        return await restoreBlock(await services.getDb(), request.blockId);
      },
    }),
  ] as const;
}
