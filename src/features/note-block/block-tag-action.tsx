import { Trans } from "@lingui/react/macro";
import { TagIcon } from "lucide-react";

import type { Tag } from "@/clients";
import { TagComboboxPopover } from "@/routes/-features/tag-combobox-popover";

interface BlockTagActionProps {
  tags: Tag[];
  selectedTagIds: string[];
  popupContainer?: HTMLElement | null;
  isCreatingTag: boolean;
  onCreateTag: (name: string) => Promise<void>;
  onSelectedTagIdsChange: (tagIds: string[]) => void | Promise<void>;
}

export function BlockTagAction({
  tags,
  selectedTagIds,
  popupContainer,
  isCreatingTag,
  onCreateTag,
  onSelectedTagIdsChange,
}: BlockTagActionProps) {
  return (
    <TagComboboxPopover
      placeholder="Search or assign tags"
      isCreatingTag={isCreatingTag}
      popupContainer={popupContainer}
      selectedTagIds={selectedTagIds}
      tags={tags}
      triggerSize="icon-xs"
      trigger={
        <>
          <TagIcon className="size-3" />
          <span className="sr-only">
            <Trans id="workspace.tags.assign.button">Assign tags</Trans>
          </span>
        </>
      }
      onCreateTag={onCreateTag}
      onSelectedTagIdsChange={onSelectedTagIdsChange}
    />
  );
}
