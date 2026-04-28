import type { AppDatabase } from "@main/core/database/database-client";
import {
  defineIpcCommandDefinition,
  type AnyIpcCommandDefinition,
} from "@main/core/ipc/ipc-command-definition";

import { createTag, deleteTag, listTags, setBlockTags } from "./service";

interface TagsCommandServices {
  getDb: () => Promise<AppDatabase>;
}

export function createTagsIpcCommands(
  services: TagsCommandServices,
): readonly AnyIpcCommandDefinition[] {
  return [
    defineIpcCommandDefinition({
      key: "tagsList",
      async handle() {
        return await listTags(await services.getDb());
      },
    }),
    defineIpcCommandDefinition({
      key: "tagsCreate",
      async handle(request) {
        return await createTag(await services.getDb(), request.name);
      },
    }),
    defineIpcCommandDefinition({
      key: "tagsDelete",
      async handle(request) {
        await deleteTag(await services.getDb(), request.tagId);
        return undefined;
      },
    }),
    defineIpcCommandDefinition({
      key: "tagsSetBlockTags",
      async handle(request) {
        return await setBlockTags(await services.getDb(), request.blockId, request.tagIds);
      },
    }),
  ] as const;
}
