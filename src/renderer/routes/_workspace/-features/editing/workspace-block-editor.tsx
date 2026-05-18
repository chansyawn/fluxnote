import type { Block, Tag } from "@renderer/clients";
import { PersistedBlockEditor, type PersistedBlockEditorHandle } from "@renderer/features/block";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import {
  keyboardEventMatchesShortcut,
  type ShortcutPreferences,
} from "@renderer/features/shortcut/shortcut-utils";
import type { ExternalEditTrigger } from "@shared/features/external-edit/session-contracts";
import { memo, useCallback, useRef, useState } from "react";

import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";
import { BlockActions } from "./block-actions";
import { useEditorRegistryContext } from "./editor-registry-context";
import { ExternalEditActions } from "./external-edit-actions";

interface WorkspaceBlockEditorProps {
  block: Block;
  commands: WorkspaceCommands;
  state: WorkspaceBlockState;
  tags: Tag[];
}

function WorkspaceBlockActions({ block, commands, state, tags }: WorkspaceBlockEditorProps) {
  const registry = useEditorRegistryContext();
  const { shortcuts } = useShortcutState();

  const handleCopy = useCallback(() => {
    void registry.getEditor(block.id)?.copy();
  }, [block.id, registry]);

  const handleCreateTag = useCallback(
    async (name: string) => {
      const tag = await commands.createTag(name);
      const currentTagIds = block.tags.map((t) => t.id);
      await commands.assignBlockTags(block.id, [...new Set([...currentTagIds, tag.id])]);
    },
    [block.id, block.tags, commands],
  );

  const handleAssignTags = useCallback(
    async (tagIds: string[]) => {
      await commands.assignBlockTags(block.id, tagIds);
    },
    [block.id, commands],
  );

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
        onCopy: handleCopy,
        onToggleKeep: () => {
          commands.setBlockKeepState(block.id, !block.isKept);
        },
        onToggleArchive: () => {
          if (state.visibility === "active") {
            commands.archiveBlock(block.id);
          } else {
            commands.restoreBlock(block.id);
          }
        },
        onDelete: () => {
          if (state.externalEditSession) {
            commands.cancelExternalEdit(state.externalEditSession.editId);
            return;
          }
          commands.deleteBlock(block.id);
        },
        onCreateTag: handleCreateTag,
        onAssignTags: handleAssignTags,
      }}
    />
  );
}

function WorkspaceExternalEditActions({
  blockId,
  editId,
  trigger,
  commands,
  shortcuts,
  isPending,
}: {
  blockId: string;
  editId: string;
  trigger: ExternalEditTrigger;
  commands: WorkspaceCommands;
  shortcuts: ShortcutPreferences;
  isPending: boolean;
}) {
  return (
    <ExternalEditActions
      shortcuts={shortcuts}
      pending={isPending}
      trigger={trigger}
      onCancel={() => {
        commands.cancelExternalEdit(editId);
      }}
      onSubmit={() => {
        commands.submitExternalEdit(blockId, editId);
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
  const registry = useEditorRegistryContext();
  const { shortcuts } = useShortcutState();

  const setEditorRef = useCallback(
    (handle: PersistedBlockEditorHandle | null) => {
      registry.registerEditor(block.id, handle);
    },
    [block.id, registry],
  );

  const shouldRenderActions = isActionAreaActive || Boolean(state.externalEditSession);
  const externalEditId = state.externalEditSession?.editId ?? null;

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
          commands.submitExternalEdit(block.id, externalEditId);
          return;
        }

        if (keyboardEventMatchesShortcut(event, shortcuts["cancel-external-edit"])) {
          event.preventDefault();
          event.stopPropagation();
          commands.cancelExternalEdit(externalEditId);
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
      <PersistedBlockEditor
        ref={setEditorRef}
        actions={
          shouldRenderActions ? (
            <WorkspaceBlockActions block={block} commands={commands} state={state} tags={tags} />
          ) : null
        }
        isExternalEditPending={Boolean(state.externalEditSession)}
        leadingActions={
          state.externalEditSession ? (
            <WorkspaceExternalEditActions
              blockId={block.id}
              editId={state.externalEditSession.editId}
              trigger={state.externalEditSession.trigger}
              commands={commands}
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
