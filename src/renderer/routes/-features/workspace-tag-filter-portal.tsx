import { Trans } from "@lingui/react/macro";
import { TagComboboxPopover } from "@renderer/routes/-features/tag-combobox-popover";
import { useBlockWorkspace } from "@renderer/routes/-features/use-block-workspace";
import { Button } from "@renderer/ui/components/button";
import { ArchiveIcon, ArchiveRestoreIcon, TagsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const TITLEBAR_ACTIONS_ID = "titlebar-workspace-actions";

export function WorkspaceTagFilterPortal() {
  const {
    tags,
    visibility,
    selectedTagIds,
    isTagOpPending,
    setVisibility,
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
    <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          setVisibility(visibility === "active" ? "archived" : "active");
        }}
      >
        {visibility === "active" ? (
          <ArchiveIcon className="size-3.5" />
        ) : (
          <ArchiveRestoreIcon className="size-3.5" />
        )}
        <span className="sr-only">
          {visibility === "active" ? (
            <Trans id="workspace.visibility.show-archived">Show archived blocks</Trans>
          ) : (
            <Trans id="workspace.visibility.show-active">Show active blocks</Trans>
          )}
        </span>
      </Button>
      <TagComboboxPopover
        placeholder="Search or create tags"
        isCreatingTag={isTagOpPending("create")}
        isDeletingTag={(tagId) => isTagOpPending("delete", tagId)}
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
