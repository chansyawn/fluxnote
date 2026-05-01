import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { BlockVisibility, Tag } from "@renderer/features/ipc";
import { TagComboboxPopover } from "@renderer/features/tag/tag-combobox-popover";
import type { TagMutationOperation } from "@renderer/features/tag/use-tag-data";
import { Button } from "@renderer/ui/components/button";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  LoaderCircleIcon,
  PlusIcon,
  TagsIcon,
} from "lucide-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";

const TITLEBAR_ACTIONS_ID = "titlebar-workspace-actions";

interface WorkspaceTitlebarActionsPortalProps {
  tags: Tag[];
  visibility: BlockVisibility;
  isCreatingBlock: boolean;
  selectedTagIds: string[];
  isTagOpPending: (op: TagMutationOperation, tagId?: string) => boolean;
  onCreateBlock: () => Promise<void>;
  onSetVisibility: (v: BlockVisibility) => void;
  onSetSelectedTagIds: Dispatch<SetStateAction<string[]>>;
  onCreateTag: (name: string) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
}

export function WorkspaceTitlebarActionsPortal({
  tags,
  visibility,
  isCreatingBlock,
  selectedTagIds,
  isTagOpPending,
  onCreateBlock,
  onSetVisibility,
  onSetSelectedTagIds,
  onCreateTag,
  onDeleteTag,
}: WorkspaceTitlebarActionsPortalProps) {
  const { i18n } = useLingui();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById(TITLEBAR_ACTIONS_ID));
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div className="flex shrink-0 items-center gap-1 [-webkit-app-region:no-drag]">
      {visibility === "active" ? (
        <Button
          disabled={isCreatingBlock}
          size="icon"
          variant="ghost"
          onClick={() => {
            void onCreateBlock();
          }}
        >
          {isCreatingBlock ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
          <span className="sr-only">
            <Trans id="workspace.add-block">Add block</Trans>
          </span>
        </Button>
      ) : null}
      <Button
        size="icon"
        variant="ghost"
        onClick={() => {
          onSetVisibility(visibility === "active" ? "archived" : "active");
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
        placeholder={i18n._({
          id: "workspace.tags.filter.placeholder",
          message: "Search or create tags",
        })}
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
        onCreateTag={onCreateTag}
        onDeleteTag={onDeleteTag}
        onSelectedTagIdsChange={onSetSelectedTagIds}
      />
    </div>,
    portalTarget,
  );
}
