import type { Block, Tag } from "@renderer/clients";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { WorkspaceBlockState } from "../workspace-state-context";
import { BlockActions, type BlockActionPosition, type ProtectedKeepReason } from "./block-actions";
import { ExternalEditControls } from "./external-edit-controls";
import { ExternalEditMetadataCard } from "./external-edit-metadata-card";

interface BlockAdornmentsProps {
  actions: WorkspaceBlockActions;
  active: boolean;
  block: Block;
  copyFeedbackActive: boolean;
  position: BlockActionPosition;
  shortcuts: ShortcutPreferences;
  state: WorkspaceBlockState;
  tags: Tag[];
}

export function BlockAdornments({
  actions,
  active,
  block,
  copyFeedbackActive,
  position,
  shortcuts,
  state,
  tags,
}: BlockAdornmentsProps) {
  const externalEditSession = state.externalEditSession;
  const shouldShowBlockActions = active || Boolean(externalEditSession);
  const protectedKeepReason: ProtectedKeepReason = externalEditSession
    ? "external-edit"
    : block.isPinned
      ? "pinned"
      : null;

  if (!externalEditSession && !shouldShowBlockActions) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {externalEditSession ? (
        <>
          <ExternalEditControls
            className="shrink-0"
            shortcuts={shortcuts}
            pending={state.isExternalEditPending}
            onCancel={() => {
              void actions.cancelExternalEdit();
            }}
            onSubmit={() => {
              void actions.submitExternalEdit();
            }}
          />
          <ExternalEditMetadataCard className="min-w-0" trigger={externalEditSession.trigger} />
        </>
      ) : null}
      {shouldShowBlockActions ? (
        <BlockActions
          className="ml-auto shrink-0"
          block={block}
          position={position}
          state={{
            tags,
            shortcuts,
            copied: copyFeedbackActive,
            disabled: state.isLocked,
            protectedKeepReason,
            pending: {
              archive: state.isArchivePending,
              delete: state.isDeletePending,
              keep: state.isKeepPending,
              pinned: state.isPinnedPending,
              reorder: state.isReorderPending,
              tag: state.isTagCreatePending,
            },
          }}
          handlers={{
            onCopy: actions.copy,
            onReorder: actions.reorder,
            onToggleKeep: actions.toggleKeep,
            onTogglePinned: actions.togglePinned,
            onToggleArchive: actions.toggleArchive,
            onDelete: actions.deleteOrCancelExternalEdit,
            onCreateTag: actions.createTag,
            onAssignTags: actions.assignTags,
          }}
        />
      ) : null}
    </div>
  );
}
