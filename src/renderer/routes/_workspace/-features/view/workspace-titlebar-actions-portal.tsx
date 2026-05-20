import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { BlockVisibility, Tag, UpdateTagRequest } from "@renderer/clients";
import { TagComboboxPopover } from "@renderer/features/tag/tag-combobox-popover";
import { TagEditDialog } from "@renderer/features/tag/tag-edit-dialog";
import type { TagMutationOperation } from "@renderer/features/tag/use-tag-data";
import { Button } from "@renderer/ui/components/button";
import { cn } from "@renderer/ui/lib/utils";
import { ArchiveIcon, LoaderCircleIcon, PlusIcon, TagsIcon } from "lucide-react";
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
  onUpdateTag: (req: UpdateTagRequest) => Promise<unknown>;
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
  onUpdateTag,
}: WorkspaceTitlebarActionsPortalProps) {
  const { i18n } = useLingui();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById(TITLEBAR_ACTIONS_ID));
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <>
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
          <ArchiveIcon className={cn("size-3.5", visibility === "archived" && "fill-primary")} />
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
          isEditingTag={(tagId) => isTagOpPending("update", tagId)}
          selectedTagIds={selectedTagIds}
          tags={tags}
          trigger={
            <>
              <TagsIcon className={cn("size-3.5", selectedTagIds.length > 0 && "fill-primary")} />
              <span className="sr-only">
                <Trans id="workspace.tags.filter.button">Filter tags</Trans>
              </span>
            </>
          }
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
          onEditTag={setEditingTag}
          onSelectedTagIdsChange={onSetSelectedTagIds}
        />
      </div>
      <TagEditDialog
        open={editingTag !== null}
        pending={editingTag ? isTagOpPending("update", editingTag.id) : false}
        tag={editingTag}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingTag(null);
          }
        }}
        onSubmit={async (req) => {
          await onUpdateTag(req);
          setEditingTag(null);
        }}
      />
    </>,
    portalTarget,
  );
}
