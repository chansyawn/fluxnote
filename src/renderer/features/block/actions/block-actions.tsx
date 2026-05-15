import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { Block, BlockVisibility, Tag } from "@renderer/clients";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import { TagComboboxPopover } from "@renderer/features/tag/tag-combobox-popover";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { cn } from "@renderer/ui/lib/utils";
import { ArchiveIcon, ArchiveRestoreIcon, FlagIcon, TagIcon, Trash2Icon } from "lucide-react";

import { CopyAction, IconAction } from "./icon-action";

export const ACTION_BAR_CLS = "border-border/70 bg-card/95 rounded-lg border p-0.25";
export const ACTION_BAR_DISABLED_CLS = "pointer-events-none opacity-75";

interface BlockActionsProps {
  block: Block;
  state: {
    visibility: BlockVisibility;
    tags: Tag[];
    shortcuts?: ShortcutPreferences;
    disabled?: boolean;
    pending?: { archive?: boolean; delete?: boolean; keep?: boolean; tag?: boolean };
  };
  handlers: {
    onCopy: () => void;
    onToggleKeep: () => void;
    onToggleArchive: () => void;
    onDelete: () => void;
    onCreateTag: (name: string) => Promise<void>;
    onAssignTags: (tagIds: string[]) => Promise<void>;
  };
}

export function BlockActions({ block, state, handlers }: BlockActionsProps) {
  const { i18n } = useLingui();
  const { visibility, tags, shortcuts, disabled, pending = {} } = state;
  const isArchived = visibility !== "active";

  return (
    <ButtonGroup
      aria-disabled={disabled}
      className={cn(ACTION_BAR_CLS, disabled && ACTION_BAR_DISABLED_CLS)}
    >
      <CopyAction disabled={disabled} onCopy={handlers.onCopy} />
      <TagComboboxPopover
        disabled={disabled}
        isCreatingTag={pending.tag ?? false}
        placeholder={i18n._({
          id: "workspace.tags.assign.placeholder",
          message: "Search or assign tags",
        })}
        selectedTagIds={block.tags.map((tag) => tag.id)}
        tags={tags}
        triggerSize="icon-xs"
        trigger={
          <>
            <TagIcon className={cn("size-3", block.tags.length > 0 && "fill-primary")} />
            <span className="sr-only">
              <Trans id="workspace.tags.assign.button">Assign tags</Trans>
            </span>
          </>
        }
        onCreateTag={handlers.onCreateTag}
        onSelectedTagIdsChange={handlers.onAssignTags}
      />
      {isArchived ? null : (
        <IconAction
          active={block.isKept}
          icon={<FlagIcon className={cn("size-3", block.isKept && "fill-primary")} />}
          shortcut={shortcuts?.["keep-block"]}
          label={
            block.isKept ? (
              <Trans id="workspace.blocks.unkeep">Allow auto archive</Trans>
            ) : (
              <Trans id="workspace.blocks.keep">Keep from auto archive</Trans>
            )
          }
          tooltipLabel={
            block.isKept ? (
              <Trans id="workspace.blocks.unkeep.tooltip">Unkeep</Trans>
            ) : (
              <Trans id="workspace.blocks.keep.tooltip">Keep</Trans>
            )
          }
          disabled={disabled}
          pending={pending.keep}
          onClick={handlers.onToggleKeep}
        />
      )}
      <IconAction
        icon={
          isArchived ? (
            <ArchiveRestoreIcon className="size-3" />
          ) : (
            <ArchiveIcon className="size-3" />
          )
        }
        label={
          isArchived ? (
            <Trans id="workspace.blocks.restore">Restore block</Trans>
          ) : (
            <Trans id="workspace.blocks.archive">Archive block</Trans>
          )
        }
        tooltipLabel={
          isArchived ? (
            <Trans id="workspace.blocks.restore.tooltip">Restore</Trans>
          ) : (
            <Trans id="workspace.blocks.archive.tooltip">Archive</Trans>
          )
        }
        shortcut={shortcuts?.["archive-block"]}
        disabled={disabled}
        pending={pending.archive}
        onClick={handlers.onToggleArchive}
      />
      <IconAction
        icon={<Trash2Icon className="size-3" />}
        label={<Trans id="home-note.block.delete">Delete block</Trans>}
        tooltipLabel={<Trans id="home-note.block.delete.tooltip">Delete</Trans>}
        shortcut={shortcuts?.["delete-block"]}
        disabled={disabled}
        pending={pending.delete}
        onClick={handlers.onDelete}
      />
    </ButtonGroup>
  );
}
