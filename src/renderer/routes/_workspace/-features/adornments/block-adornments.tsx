import type { Block, Tag } from "@renderer/clients";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";

import type { WorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { WorkspaceBlockState } from "../workspace-state-context";
import { AdornmentCluster } from "./adornment-cluster";
import { BlockActions } from "./block-actions";
import { ExternalEditControls } from "./external-edit-controls";
import { ExternalEditMetadataCard } from "./external-edit-metadata-card";

interface BlockAdornmentsProps {
  actions: WorkspaceBlockActions;
  active: boolean;
  block: Block;
  copyFeedbackActive: boolean;
  shortcuts: ShortcutPreferences;
  state: WorkspaceBlockState;
  tags: Tag[];
}

export function BlockAdornments({
  actions,
  active,
  block,
  copyFeedbackActive,
  shortcuts,
  state,
  tags,
}: BlockAdornmentsProps) {
  const externalEditSession = state.externalEditSession;
  const shouldShowBlockActions = active || Boolean(externalEditSession);

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
        <BlockActions
          className="ml-auto shrink-0"
          block={block}
          state={{
            tags,
            shortcuts,
            copied: copyFeedbackActive,
            disabled: state.isLocked,
            pending: {
              archive: state.isArchivePending,
              delete: state.isDeletePending,
              keep: state.isKeepPending,
              tag: state.isTagCreatePending,
            },
          }}
          handlers={{
            onCopy: actions.copy,
            onToggleKeep: actions.toggleKeep,
            onToggleArchive: actions.toggleArchive,
            onDelete: actions.deleteOrCancelExternalEdit,
            onCreateTag: actions.createTag,
            onAssignTags: actions.assignTags,
          }}
        />
      ) : null}
    </AdornmentCluster>
  );
}
