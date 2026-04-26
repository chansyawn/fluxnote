import type { BackendStore } from "../backend-store";
import type { AppDatabase } from "../database/database-client";
import {
  defineIpcCommandHandler,
  type AnyIpcCommandHandlerDefinition,
} from "../ipc/ipc-handler-definition";
import {
  archiveBlock,
  createBlockRecord,
  deleteBlock,
  listBlocks,
  locateBlock,
  restoreBlock,
  updateBlockContent,
} from "./block-service";

interface BlocksCommandServices {
  getDb: () => Promise<AppDatabase>;
  store: BackendStore;
}

export function createBlocksCommandHandlers(
  services: BlocksCommandServices,
): readonly AnyIpcCommandHandlerDefinition[] {
  return [
    defineIpcCommandHandler({
      key: "blocksList",
      async handle(request) {
        return listBlocks(
          await services.getDb(),
          request.tagIds,
          request.visibility,
          request.offset,
          request.limit,
        );
      },
    }),
    defineIpcCommandHandler({
      key: "blocksLocate",
      async handle(request) {
        return locateBlock(
          await services.getDb(),
          request.blockId,
          request.tagIds,
          request.visibility,
        );
      },
    }),
    defineIpcCommandHandler({
      key: "blocksCreate",
      async handle() {
        return createBlockRecord(await services.getDb());
      },
    }),
    defineIpcCommandHandler({
      key: "blocksUpdateContent",
      async handle(request) {
        return updateBlockContent(await services.getDb(), request.blockId, request.content);
      },
    }),
    defineIpcCommandHandler({
      key: "blocksDelete",
      async handle(request) {
        return deleteBlock(
          await services.getDb(),
          request.blockId,
          services.store.getAssetPathForBlock(request.blockId),
        );
      },
    }),
    defineIpcCommandHandler({
      key: "blocksArchive",
      async handle(request) {
        return archiveBlock(await services.getDb(), request.blockId);
      },
    }),
    defineIpcCommandHandler({
      key: "blocksRestore",
      async handle(request) {
        return restoreBlock(await services.getDb(), request.blockId);
      },
    }),
  ] as const;
}
