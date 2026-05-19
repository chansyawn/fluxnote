import type { Block, Tag } from "@renderer/clients";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import {
  keyboardEventMatchesShortcut,
  type ShortcutPreferences,
} from "@renderer/features/shortcut/shortcut-utils";
import type { ExternalEditTrigger } from "@shared/features/external-edit/session-contracts";
import { memo, useCallback, useRef, useState } from "react";

import { BlockActions } from "../block-actions/block-actions";
import {
  useWorkspaceBlockActionsModel,
  type WorkspaceBlockActionsModel,
} from "../block-actions/block-actions-model";
import { useBlockEditorRegistryContext } from "../editor-registry/block-editor-registry-context";
import { ExternalEditActions } from "../external-edit/external-edit-actions";
import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";
import {
  WorkspaceBlockEditorSurface,
  type WorkspaceBlockEditorHandle,
} from "./workspace-block-editor-surface";

interface WorkspaceBlockEditorProps {
  block: Block;
  commands: WorkspaceCommands;
  state: WorkspaceBlockState;
  tags: Tag[];
}

interface WorkspaceBlockActionsProps {
  actions: WorkspaceBlockActionsModel;
  block: Block;
  state: WorkspaceBlockState;
  tags: Tag[];
}

function WorkspaceBlockActions({ actions, block, state, tags }: WorkspaceBlockActionsProps) {
  const { shortcuts } = useShortcutState();

  return (
    <BlockActions
      block={block}
      state={{
        visibility: state.visibility,
        tags,
        shortcuts,
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
  );
}

function WorkspaceExternalEditActions({
  editId,
  trigger,
  actions,
  shortcuts,
  isPending,
}: {
  editId: string;
  trigger: ExternalEditTrigger;
  actions: WorkspaceBlockActionsModel;
  shortcuts: ShortcutPreferences;
  isPending: boolean;
}) {
  return (
    <ExternalEditActions
      shortcuts={shortcuts}
      pending={isPending}
      trigger={trigger}
      onCancel={() => {
        actions.cancelExternalEdit(editId);
      }}
      onSubmit={() => {
        actions.submitExternalEdit(editId);
      }}
    />
  );
}

export const WorkspaceBlockEditor = memo(function WorkspaceBlockEditor({
  block,
  commands,
  state,
  tags,
}: WorkspaceBlockEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isActionAreaActive, setIsActionAreaActive] = useState(false);
  const registry = useBlockEditorRegistryContext();
  const { shortcuts } = useShortcutState();

  const setEditorRef = useCallback(
    (handle: WorkspaceBlockEditorHandle | null) => {
      registry.registerEditor(block.id, handle);
    },
    [block.id, registry],
  );

  const shouldRenderActions = isActionAreaActive || Boolean(state.externalEditSession);
  const externalEditId = state.externalEditSession?.editId ?? null;
  const actions = useWorkspaceBlockActionsModel({
    block,
    commands,
    getEditor: registry.getEditor,
    state,
  });

  return (
    <div
      ref={rootRef}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
          setIsActionAreaActive(false);
        }
      }}
      onFocusCapture={() => {
        setIsActionAreaActive(true);
      }}
      onKeyDownCapture={(event) => {
        if (!externalEditId || event.repeat) {
          return;
        }

        if (keyboardEventMatchesShortcut(event, shortcuts["submit-external-edit"])) {
          event.preventDefault();
          event.stopPropagation();
          actions.submitExternalEdit(externalEditId);
          return;
        }

        if (keyboardEventMatchesShortcut(event, shortcuts["cancel-external-edit"])) {
          event.preventDefault();
          event.stopPropagation();
          actions.cancelExternalEdit(externalEditId);
        }
      }}
      onMouseEnter={() => {
        setIsActionAreaActive(true);
      }}
      onMouseLeave={() => {
        if (rootRef.current?.contains(document.activeElement)) {
          return;
        }
        setIsActionAreaActive(false);
      }}
    >
      <WorkspaceBlockEditorSurface
        ref={setEditorRef}
        actions={
          shouldRenderActions ? (
            <WorkspaceBlockActions actions={actions} block={block} state={state} tags={tags} />
          ) : null
        }
        isExternalEditPending={Boolean(state.externalEditSession)}
        leadingActions={
          state.externalEditSession ? (
            <WorkspaceExternalEditActions
              editId={state.externalEditSession.editId}
              trigger={state.externalEditSession.trigger}
              actions={actions}
              shortcuts={shortcuts}
              isPending={state.isExternalEditPending}
            />
          ) : null
        }
        block={block}
        onFocus={commands.focusBlock}
      />
    </div>
  );
});
