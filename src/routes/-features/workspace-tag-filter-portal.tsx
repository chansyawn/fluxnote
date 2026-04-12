import { Trans } from "@lingui/react/macro";
import { TagsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { TagComboboxPopover } from "@/routes/-features/tag-combobox-popover";
import { useBlockWorkspace } from "@/routes/-features/use-block-workspace";

const TITLEBAR_ACTIONS_ID = "titlebar-workspace-actions";

export function WorkspaceTagFilterPortal() {
  const {
    tags,
    selectedTagIds,
    isCreatingTag,
    deletingTagId,
    setSelectedTagFilters,
    createTagAndSelectForFilter,
    deleteTag,
  } = useBlockWorkspace();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById(TITLEBAR_ACTIONS_ID));
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div className="flex shrink-0 items-center" data-window-control>
      <TagComboboxPopover
        deletingTagId={deletingTagId}
        placeholder="Search or create tags"
        isCreatingTag={isCreatingTag}
        selectedTagIds={selectedTagIds}
        tags={tags}
        trigger={
          <>
            <TagsIcon className="size-3.5" />
            <span className="sr-only">
              <Trans id="workspace.tags.filter.button">Filter tags</Trans>
            </span>
          </>
        }
        onCreateTag={createTagAndSelectForFilter}
        onDeleteTag={deleteTag}
        onSelectedTagIdsChange={setSelectedTagFilters}
      />
    </div>,
    portalTarget,
  );
}
