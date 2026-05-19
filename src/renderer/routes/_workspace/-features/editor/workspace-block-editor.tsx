import type { Block, Tag } from "@renderer/clients";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { memo, useCallback, useRef, useState } from "react";

import { useWorkspaceBlockActions } from "../actions/workspace-block-actions";
import { BlockAdornments } from "../adornments/block-adornments";
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
  state: WorkspaceBlockState;
  tags: Tag[];
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

  const actions = useWorkspaceBlockActions({
    block,
    commands,
    getEditor: registry.getEditor,
    state,
  });
  useWorkspaceBlockActionShortcuts({
    actions,
    isActiveBlockEditorFocused: () => {
      const focusedBlockEditor = document.activeElement?.closest<HTMLElement>("[data-block-id]");
      return focusedBlockEditor?.dataset.blockId === block.id;
    },
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
