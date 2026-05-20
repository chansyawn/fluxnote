import type { AppDatabase } from "@main/core/database";
import type { IpcRouter } from "@main/core/ipc";

import { createTag, deleteTag, listTags, setBlockTags, updateTag } from "./service";

interface TagsCommandDeps {
  db: AppDatabase;
}

export function registerTagsCommands(ipc: IpcRouter, deps: TagsCommandDeps): void {
  ipc.command("tags.create", async (input) => {
    return await createTag(deps.db, input.name, input.color ?? null);
  });

  ipc.command("tags.delete", async (input) => {
    await deleteTag(deps.db, input.tagId);
    return undefined;
  });

  ipc.command("tags.update", async (input) => {
    return await updateTag(deps.db, input.tagId, {
      color: input.color,
      icon: input.icon,
      name: input.name,
    });
  });

  ipc.command("tags.list", async () => {
    return await listTags(deps.db);
  });

  ipc.command("tags.set-block-tags", async (input) => {
    return await setBlockTags(deps.db, input.blockId, input.tagIds);
  });
}
