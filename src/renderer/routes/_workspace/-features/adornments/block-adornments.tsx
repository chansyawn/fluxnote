import type { Block, Tag } from "@renderer/clients";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { WorkspaceBlockState } from "../workspace-state-context";
import { AdornmentCluster } from "./adornment-cluster";
import { BlockActions, type BlockActionPosition, type ProtectedKeepReason } from "./block-actions";
import { BlockTagActions } from "./block-tag-actions";
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
    <AdornmentCluster>
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
        <BlockTagActions
          block={block}
          className="ml-auto"
          state={{
            tags,
            disabled: state.isLocked,
            pending: state.isTagCreatePending,
          }}
          handlers={{
            onCreateTag: actions.createTag,
            onAssignTags: actions.assignTags,
          }}
        />
      ) : null}
      {shouldShowBlockActions ? (
        <BlockActions
          block={block}
          position={position}
          state={{
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
            },
          }}
          handlers={{
            onCopy: actions.copy,
            onReorder: actions.reorder,
            onToggleKeep: actions.toggleKeep,
            onTogglePinned: actions.togglePinned,
            onToggleArchive: actions.toggleArchive,
            onDelete: actions.deleteOrCancelExternalEdit,
          }}
        />
      ) : null}
    </AdornmentCluster>
  );
}
