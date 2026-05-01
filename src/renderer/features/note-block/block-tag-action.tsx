import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { Tag } from "@renderer/clients";
import { TagComboboxPopover } from "@renderer/features/tag/tag-combobox-popover";
import { TagIcon } from "lucide-react";

interface BlockTagActionProps {
  tags: Tag[];
  selectedTagIds: string[];
  isDisabled: boolean;
  isCreatingTag: boolean;
  onCreateTag: (name: string) => Promise<void>;
  onSelectedTagIdsChange: (tagIds: string[]) => void | Promise<void>;
}

export function BlockTagAction({
  tags,
  selectedTagIds,
  isDisabled,
  isCreatingTag,
  onCreateTag,
  onSelectedTagIdsChange,
}: BlockTagActionProps) {
  const { i18n } = useLingui();

  return (
    <TagComboboxPopover
      placeholder={i18n._({
        id: "workspace.tags.assign.placeholder",
        message: "Search or assign tags",
      })}
      disabled={isDisabled}
      isCreatingTag={isCreatingTag}
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
