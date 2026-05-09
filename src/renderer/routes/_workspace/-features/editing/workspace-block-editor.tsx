import type { Block, Tag } from "@renderer/clients";
import {
  BlockActions,
  BlockEditorController,
  ExternalEditActions,
  type BlockEditorControllerHandle,
} from "@renderer/features/block";
import { memo, useCallback, useRef, useState } from "react";

import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";
import { useEditorRegistryContext } from "./editor-registry-context";

interface WorkspaceBlockEditorProps {
  block: Block;
  commands: WorkspaceCommands;
  state: WorkspaceBlockState;
  tags: Tag[];
}

function WorkspaceBlockActions({ block, commands, state, tags }: WorkspaceBlockEditorProps) {
  const registry = useEditorRegistryContext();

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
        disabled: state.isLocked,
        pending: {
          archive: state.isArchivePending,
          delete: state.isDeletePending,
          tag: state.isTagCreatePending,
        },
      }}
      handlers={{
        onCopy: handleCopy,
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
  commands,
  isPending,
}: {
  blockId: string;
  editId: string;
  commands: WorkspaceCommands;
  isPending: boolean;
}) {
  return (
    <ExternalEditActions
      pending={isPending}
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

  const setEditorRef = useCallback(
    (handle: BlockEditorControllerHandle | null) => {
      registry.registerEditor(block.id, handle);
    },
    [block.id, registry],
  );

  const shouldRenderActions = isActionAreaActive || Boolean(state.externalEditSession);

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
      <BlockEditorController
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
              commands={commands}
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
