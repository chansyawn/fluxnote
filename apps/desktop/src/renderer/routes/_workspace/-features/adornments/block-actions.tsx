import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { Block, Tag } from "@renderer/clients";
import {
  formatShortcutTokens,
  type ShortcutBinding,
  type ShortcutPreferences,
} from "@renderer/features/shortcut/shortcut-utils";
import { TagComboboxPopover } from "@renderer/features/tag/tag-combobox-popover";
import { Button } from "@renderer/ui/components/button";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@renderer/ui/components/dropdown-menu";
import { cn } from "@renderer/ui/lib/utils";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpIcon,
  EllipsisIcon,
  FlagOffIcon,
  FlagIcon,
  LoaderCircleIcon,
  PinOffIcon,
  PinIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import type { ComponentProps } from "react";

import type { BlockReorderOperation } from "../use-block-mutations";
import { AdornmentBar } from "./adornment-bar";
import { CopyAction, IconAction } from "./icon-action";

export type AutoArchiveProtectionReason = "external-edit" | "pinned" | null;

export interface BlockActionPosition {
  canMoveDown: boolean;
  canMoveToTop: boolean;
  canMoveUp: boolean;
}

interface BlockActionsProps extends Pick<ComponentProps<"div">, "className"> {
  block: Block;
  position: BlockActionPosition;
  state: {
    tags: Tag[];
    shortcuts?: ShortcutPreferences;
    copied?: boolean;
    disabled?: boolean;
    autoArchiveProtectionReason?: AutoArchiveProtectionReason;
    pending?: {
      archive?: boolean;
      delete?: boolean;
      keep?: boolean;
      pinned?: boolean;
      reorder?: boolean;
      tag?: boolean;
    };
  };
  handlers: {
    onCopy: () => Promise<void>;
    onReorder: (operation: BlockReorderOperation) => Promise<void>;
    onToggleKeep: () => Promise<void>;
    onTogglePinned: () => Promise<void>;
    onToggleArchive: () => Promise<void>;
    onDelete: () => Promise<void>;
    onCreateTag: (name: string) => Promise<void>;
    onAssignTags: (tagIds: string[]) => Promise<void>;
  };
}

function BlockActionMenuShortcut({ shortcut }: { shortcut?: ShortcutBinding }) {
  const shortcutLabel = formatShortcutTokens(shortcut ?? null).join("+");

  if (!shortcutLabel) {
    return null;
  }

  return <DropdownMenuShortcut>{shortcutLabel}</DropdownMenuShortcut>;
}

function BlockKeepMenuLabel({
  block,
  autoArchiveProtectionReason,
}: {
  block: Block;
  autoArchiveProtectionReason: AutoArchiveProtectionReason;
}) {
  if (autoArchiveProtectionReason === "external-edit") {
    return (
      <Trans id="workspace.blocks.auto-archive.protected-by-external-edit">
        External edit protects this block from auto archive
      </Trans>
    );
  }

  if (autoArchiveProtectionReason === "pinned") {
    return (
      <Trans id="workspace.blocks.auto-archive.protected-by-pin">
        Pinned blocks are protected from auto archive
      </Trans>
    );
  }

  return block.isKept ? (
    <Trans id="workspace.blocks.unkeep">Allow auto archive</Trans>
  ) : (
    <Trans id="workspace.blocks.keep">Keep from auto archive</Trans>
  );
}

export function BlockActions({ block, className, position, state, handlers }: BlockActionsProps) {
  const { i18n } = useLingui();
  const {
    tags,
    shortcuts,
    copied = false,
    disabled,
    autoArchiveProtectionReason = null,
    pending = {},
  } = state;
  const isArchived = block.archivedAt !== null;
  const isExternalEditProtected = autoArchiveProtectionReason === "external-edit";
  const keepDisabled = disabled || pending.keep || autoArchiveProtectionReason !== null;
  const reorderDisabled = disabled || pending.reorder;

  return (
    <AdornmentBar className={className} disabled={disabled}>
      <ButtonGroup>
        <CopyAction
          copied={copied}
          disabled={disabled}
          shortcut={shortcuts?.["workspace.copyBlock"]}
          onCopy={handlers.onCopy}
        />
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
          shortcut={shortcuts?.["workspace.archiveBlock"]}
          disabled={disabled || isExternalEditProtected}
          pending={pending.archive}
          onClick={() => {
            void handlers.onToggleArchive();
          }}
        />
        <IconAction
          icon={<Trash2Icon className="size-3" />}
          label={<Trans id="workspace.blocks.delete">Delete block</Trans>}
          tooltipLabel={<Trans id="workspace.blocks.delete.tooltip">Delete</Trans>}
          shortcut={shortcuts?.["workspace.deleteBlock"]}
          disabled={disabled}
          pending={pending.delete}
          onClick={() => {
            void handlers.onDelete();
          }}
        />
        {isArchived ? null : (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={i18n._({
                id: "workspace.blocks.more-actions",
                message: "More block actions",
              })}
              disabled={disabled}
              render={<Button size="icon-xs" variant="ghost" />}
            >
              <EllipsisIcon className="size-3" />
              <span className="sr-only">
                <Trans id="workspace.blocks.more-actions">More block actions</Trans>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <Trans id="workspace.blocks.status">Status</Trans>
                </DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={keepDisabled}
                  onClick={() => {
                    void handlers.onToggleKeep();
                  }}
                >
                  {pending.keep ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : block.isKept ? (
                    <FlagOffIcon />
                  ) : (
                    <FlagIcon />
                  )}
                  <BlockKeepMenuLabel
                    block={block}
                    autoArchiveProtectionReason={autoArchiveProtectionReason}
                  />
                  <BlockActionMenuShortcut shortcut={shortcuts?.["workspace.keepBlock"]} />
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={disabled || pending.pinned}
                  onClick={() => {
                    void handlers.onTogglePinned();
                  }}
                >
                  {pending.pinned ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : block.isPinned ? (
                    <PinOffIcon />
                  ) : (
                    <PinIcon />
                  )}
                  {block.isPinned ? (
                    <Trans id="workspace.blocks.unpin">Unpin from top</Trans>
                  ) : (
                    <Trans id="workspace.blocks.pin">Pin to top</Trans>
                  )}
                  <BlockActionMenuShortcut shortcut={shortcuts?.["workspace.togglePinBlock"]} />
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <Trans id="workspace.blocks.move">Move</Trans>
                </DropdownMenuLabel>
                <DropdownMenuItem
                  disabled={reorderDisabled || !position.canMoveUp}
                  onClick={() => {
                    void handlers.onReorder("move-up");
                  }}
                >
                  <ArrowUpIcon />
                  <Trans id="workspace.blocks.move-up">Move up</Trans>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={reorderDisabled || !position.canMoveDown}
                  onClick={() => {
                    void handlers.onReorder("move-down");
                  }}
                >
                  <ArrowDownIcon />
                  <Trans id="workspace.blocks.move-down">Move down</Trans>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={reorderDisabled || !position.canMoveToTop}
                  onClick={() => {
                    void handlers.onReorder("move-to-top");
                  }}
                >
                  <ChevronsUpIcon />
                  <Trans id="workspace.blocks.move-to-top">Move to top</Trans>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </ButtonGroup>
    </AdornmentBar>
  );
}
