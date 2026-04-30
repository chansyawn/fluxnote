import type { AppDatabase } from "@main/core/database/database-client";
import { defineBackendFeature } from "@main/core/ipc/backend-feature";
import { tagsApi } from "@shared/features/tags";

import { createTag, deleteTag, listTags, setBlockTags } from "./service";

interface TagsServices {
  getDb: () => Promise<AppDatabase>;
}

export function createTagsFeature(services: TagsServices) {
  return defineBackendFeature(tagsApi, {
    commands: {
      async create(request) {
        return await createTag(await services.getDb(), request.name);
      },
      async delete(request) {
        await deleteTag(await services.getDb(), request.tagId);
        return undefined;
      },
      async list() {
        return await listTags(await services.getDb());
      },
      async setBlockTags(request) {
        return await setBlockTags(await services.getDb(), request.blockId, request.tagIds);
      },
    },
  });
}
