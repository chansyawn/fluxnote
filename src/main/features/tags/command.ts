import type { AppDatabase } from "@main/core/database/database-client";
import type { IpcRouter } from "@main/core/ipc/register-ipc";

import { createTag, deleteTag, listTags, setBlockTags } from "./service";

interface TagsCommandDeps {
  db: AppDatabase;
}

export function registerTagsCommands(ipc: IpcRouter, deps: TagsCommandDeps): void {
  ipc.command("tags.create", async (input) => {
    return await createTag(deps.db, input.name);
  });

  ipc.command("tags.delete", async (input) => {
    await deleteTag(deps.db, input.tagId);
    return undefined;
  });

  ipc.command("tags.list", async () => {
    return await listTags(deps.db);
  });

  ipc.command("tags.set-block-tags", async (input) => {
    return await setBlockTags(deps.db, input.blockId, input.tagIds);
  });
}
