import type { Block, BlockVisibility, Tag } from "@renderer/clients";
import { useState } from "react";

import { BlockActionBar } from "./block-action-bar";
import { BlockArchiveAction } from "./block-archive-action";
import { BlockCopyAction } from "./block-copy-action";
import { BlockDeleteAction } from "./block-delete-action";
import { BlockTagAction } from "./block-tag-action";

interface BlockActionsProps {
  block: Block;
  visibility: BlockVisibility;
  tags: Tag[];
  isDisabled: boolean;
  isArchivePending: boolean;
  isDeletePending: boolean;
  isTagOpPending: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onCreateTag: (name: string) => Promise<void>;
  onAssignTags: (tagIds: string[]) => Promise<void>;
}

export function BlockActions({
  block,
  visibility,
  tags,
  isDisabled,
  isArchivePending,
  isDeletePending,
  isTagOpPending,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  onCreateTag,
  onAssignTags,
}: BlockActionsProps) {
  const [popupContainer, setPopupContainer] = useState<HTMLElement | null>(null);

  return (
    <div ref={setPopupContainer}>
      <BlockActionBar disabled={isDisabled}>
        <BlockCopyAction isDisabled={isDisabled} onCopy={onCopy} />
        <BlockTagAction
          isCreatingTag={isTagOpPending}
          isDisabled={isDisabled}
          popupContainer={popupContainer}
          selectedTagIds={block.tags.map((tag) => tag.id)}
          tags={tags}
          onCreateTag={onCreateTag}
          onSelectedTagIdsChange={onAssignTags}
        />
        <BlockArchiveAction
          isDisabled={isDisabled}
          isPending={isArchivePending}
          visibility={visibility}
          onClick={visibility === "active" ? onArchive : onRestore}
        />
        <BlockDeleteAction
          isDeleting={isDeletePending}
          isDisabled={isDisabled}
          onClick={onDelete}
        />
      </BlockActionBar>
    </div>
  );
}
