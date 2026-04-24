import { Trans } from "@lingui/react/macro";
import type { Tag } from "@renderer/clients";
import { TagComboboxPopover } from "@renderer/routes/-features/tag-combobox-popover";
import { TagIcon } from "lucide-react";

interface BlockTagActionProps {
  tags: Tag[];
  selectedTagIds: string[];
  popupContainer?: HTMLElement | null;
  isDisabled: boolean;
  isCreatingTag: boolean;
  onCreateTag: (name: string) => Promise<void>;
  onSelectedTagIdsChange: (tagIds: string[]) => void | Promise<void>;
}

export function BlockTagAction({
  tags,
  selectedTagIds,
  popupContainer,
  isDisabled,
  isCreatingTag,
  onCreateTag,
  onSelectedTagIdsChange,
}: BlockTagActionProps) {
  return (
    <TagComboboxPopover
      placeholder="Search or assign tags"
      disabled={isDisabled}
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
