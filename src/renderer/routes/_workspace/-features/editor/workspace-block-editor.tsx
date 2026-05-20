import type { Block, Tag } from "@renderer/clients";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWorkspaceBlockActions } from "../actions/workspace-block-actions";
import type { BlockActionPosition } from "../adornments/block-actions";
import { BlockAdornments } from "../adornments/block-adornments";
import { COPY_FEEDBACK_DURATION_MS } from "../adornments/copy-feedback";
import { useBlockEditorRegistryContext } from "../editor-registry/block-editor-registry-context";
import { useWorkspaceBlockActionShortcuts } from "../shortcuts/use-workspace-block-shortcuts";
import type { WorkspaceBlockState, WorkspaceCommands } from "../workspace-state-context";
import {
  WorkspaceBlockEditorSurface,
  type WorkspaceBlockEditorHandle,
} from "./workspace-block-editor-surface";

interface WorkspaceBlockEditorProps {
  block: Block;
  commands: WorkspaceCommands;
  position: BlockActionPosition;
  state: WorkspaceBlockState;
  tags: Tag[];
}

export const WorkspaceBlockEditor = memo(function WorkspaceBlockEditor({
  block,
  commands,
  position,
  state,
  tags,
}: WorkspaceBlockEditorProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isActionAreaActive, setIsActionAreaActive] = useState(false);
  const [isCopyFeedbackActive, setIsCopyFeedbackActive] = useState(false);
  const registry = useBlockEditorRegistryContext();
  const { shortcuts } = useShortcutState();

  const clearCopyFeedbackTimer = useCallback(() => {
    if (!copyFeedbackTimerRef.current) {
      return;
    }

    clearTimeout(copyFeedbackTimerRef.current);
    copyFeedbackTimerRef.current = null;
  }, []);

  useEffect(
    () => () => {
      clearCopyFeedbackTimer();
    },
    [clearCopyFeedbackTimer],
  );

  const setEditorRef = useCallback(
    (handle: WorkspaceBlockEditorHandle | null) => {
      registry.registerEditor(block.id, handle);
    },
    [block.id, registry],
  );

  const blockActions = useWorkspaceBlockActions({
    block,
    commands,
    getEditor: registry.getEditor,
    state,
  });
  const copyWithFeedback = useCallback(async () => {
    await blockActions.copy();
    clearCopyFeedbackTimer();
    setIsCopyFeedbackActive(true);
    copyFeedbackTimerRef.current = setTimeout(() => {
      setIsCopyFeedbackActive(false);
      copyFeedbackTimerRef.current = null;
    }, COPY_FEEDBACK_DURATION_MS);
  }, [blockActions, clearCopyFeedbackTimer]);

  const actions = useMemo(
    () => ({
      ...blockActions,
      copy: copyWithFeedback,
    }),
    [blockActions, copyWithFeedback],
  );
  const handleShortcutKeyDownCapture = useWorkspaceBlockActionShortcuts({
    actions,
    isActiveBlockEditorFocused: () => {
      const focusedBlockEditor = document.activeElement?.closest<HTMLElement>("[data-block-id]");
      return focusedBlockEditor?.dataset.blockId === block.id;
    },
    state,
    target: rootRef,
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
      onKeyDownCapture={handleShortcutKeyDownCapture}
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
        adornments={
          <BlockAdornments
            actions={actions}
            active={isActionAreaActive}
            block={block}
            copyFeedbackActive={isCopyFeedbackActive}
            position={position}
            shortcuts={shortcuts}
            state={state}
            tags={tags}
          />
        }
        isExternalEditPending={Boolean(state.externalEditSession)}
        block={block}
        onFocus={commands.focusBlock}
      />
    </div>
  );
});
