import type { Block, Tag } from "@renderer/clients";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import { keyboardEventMatchesShortcut } from "@renderer/features/shortcut/shortcut-utils";
import { memo, useCallback, useRef, useState } from "react";

import { BlockAdornments } from "../adornments/block-adornments";
import { useWorkspaceBlockActionHandlers } from "../adornments/use-block-action-handlers";
import { useBlockEditorRegistryContext } from "../editor-registry/block-editor-registry-context";
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

  const externalEditId = state.externalEditSession?.editId ?? null;
  const actions = useWorkspaceBlockActionHandlers({
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
