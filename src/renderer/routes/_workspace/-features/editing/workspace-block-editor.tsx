import type { Block, Tag } from "@renderer/clients";
import {
  BlockActions,
  BlockEditorController,
  BlockExternalEditActions,
  type BlockEditorControllerHandle,
} from "@renderer/features/block";
import { memo, useCallback, useRef, useState } from "react";

import type { WorkspaceBlockRuntimeState, WorkspaceCommands } from "../workspace-runtime-context";
import { useEditorRegistryContext } from "./editor-registry-context";

interface WorkspaceBlockEditorProps {
  block: Block;
  commands: WorkspaceCommands;
  runtime: WorkspaceBlockRuntimeState;
  tags: Tag[];
}

function WorkspaceBlockActions({ block, commands, runtime, tags }: WorkspaceBlockEditorProps) {
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
      visibility={runtime.visibility}
      tags={tags}
      isDisabled={runtime.isLocked}
      isArchivePending={runtime.isArchivePending}
      isDeletePending={runtime.isDeletePending}
      isTagOpPending={runtime.isTagCreatePending}
      onArchive={() => {
        commands.archiveBlock(block.id);
      }}
      onRestore={() => {
        commands.restoreBlock(block.id);
      }}
      onDelete={() => {
        if (runtime.externalEditSession) {
          commands.cancelExternalEdit(runtime.externalEditSession.editId);
          return;
        }

        commands.deleteBlock(block.id);
      }}
      onCopy={handleCopy}
      onCreateTag={handleCreateTag}
      onAssignTags={handleAssignTags}
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
    <BlockExternalEditActions
      isPending={isPending}
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
  runtime,
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

  const shouldRenderActions = isActionAreaActive || Boolean(runtime.externalEditSession);

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
            <WorkspaceBlockActions
              block={block}
              commands={commands}
              runtime={runtime}
              tags={tags}
            />
          ) : null
        }
        isExternalEditPending={Boolean(runtime.externalEditSession)}
        leadingActions={
          runtime.externalEditSession ? (
            <WorkspaceExternalEditActions
              blockId={block.id}
              editId={runtime.externalEditSession.editId}
              commands={commands}
              isPending={runtime.isExternalEditPending}
            />
          ) : null
        }
        block={block}
        onFocus={commands.focusBlock}
      />
    </div>
  );
});
