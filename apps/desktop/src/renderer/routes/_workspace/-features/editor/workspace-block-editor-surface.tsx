import { cn } from "@fluxnotes/ui/lib/utils";
import { type Block } from "@renderer/clients";
import {
  BlockEditor,
  type BlockEditorConfigInput,
  type BlockEditorHandle,
  type BlockEditorRuntime,
  BLOCK_EDITOR_ACTION_DEFINITIONS,
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  type BlockEditorShortcutConfig,
} from "@renderer/features/block-editor";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

import { useBlockEditorPersistence } from "./block-editor-persistence";
import { createWorkspaceBlockEditorRuntime } from "./block-editor-runtime";

export type WorkspaceBlockEditorHandle = BlockEditorHandle;

export function pickBlockEditorShortcuts(
  shortcuts: ShortcutPreferences,
): BlockEditorShortcutConfig {
  return Object.fromEntries(
    BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, shortcuts[action.id]]),
  ) as BlockEditorShortcutConfig;
}

interface BlockEditorFrameProps {
  blockId: string;
  adornments?: ReactNode;
  editorConfig?: BlockEditorConfigInput;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  isKept: boolean;
  isPinned: boolean;
  runtime: BlockEditorRuntime;
  isPendingAutoArchive: boolean;
  onMarkdownChange: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  ref?: Ref<BlockEditorHandle>;
}

function BlockEditorFrame({
  blockId,
  adornments,
  editorConfig,
  initialMarkdown,
  isExternalEditPending = false,
  isKept,
  isPinned,
  runtime,
  isPendingAutoArchive,
  onMarkdownChange,
  onBlur,
  onFocus,
  ref,
}: BlockEditorFrameProps) {
  return (
    <article
      className={cn(
        "group bg-card relative rounded-lg border transition-opacity border-transparent",
        {
          "border-ring": isKept,
          "border-muted": isPinned,
          "border-dashed": isExternalEditPending,
          "opacity-60": isPendingAutoArchive,
        },
      )}
      data-block-id={blockId}
      onFocusCapture={onFocus}
    >
      {adornments ? (
        <div className="absolute top-0 right-1 left-1 z-10 -translate-y-1/2">{adornments}</div>
      ) : null}

      <div className="px-3 pt-3 pb-2">
        <BlockEditor
          ref={ref}
          runtime={runtime}
          initialMarkdown={initialMarkdown}
          config={editorConfig}
          onBlur={onBlur}
          onMarkdownChange={onMarkdownChange}
        />
      </div>
    </article>
  );
}

interface WorkspaceBlockEditorSurfaceProps {
  block: Block;
  adornments?: ReactNode;
  isExternalEditPending?: boolean;
  shortcuts: ShortcutPreferences;
  onFocus: (blockId: string) => void;
  ref?: Ref<WorkspaceBlockEditorHandle>;
}

export function WorkspaceBlockEditorSurface({
  block,
  adornments,
  isExternalEditPending = false,
  shortcuts,
  onFocus,
  ref,
}: WorkspaceBlockEditorSurfaceProps) {
  const editorRef = useRef<BlockEditorHandle | null>(null);
  const runtime = useMemo(() => createWorkspaceBlockEditorRuntime(block.id), [block.id]);
  const { codeBlock } = useMarkdownCodeBlockPreference();
  const editorShortcuts = useMemo(() => pickBlockEditorShortcuts(shortcuts), [shortcuts]);
  const editorConfig = useMemo<BlockEditorConfigInput>(
    () => ({
      markdown: {
        codeBlock,
      },
      shortcuts: {
        actions: editorShortcuts,
      },
    }),
    [codeBlock, editorShortcuts],
  );
  const { getLatestContent, saveMarkdown, snapshotLatestContent, waitForPendingSave } =
    useBlockEditorPersistence(block);

  useEffect(() => {
    return () => {
      void editorRef.current?.flush();
      snapshotLatestContent();
    };
  }, [snapshotLatestContent]);

  const flush = useCallback(async () => {
    const markdown = (await editorRef.current?.flush()) ?? getLatestContent();
    await waitForPendingSave();
    return markdown;
  }, [getLatestContent, waitForPendingSave]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        await editorRef.current?.copy();
      },
      focus: () => {
        editorRef.current?.focus();
      },
      executeAction: (action) => {
        return (
          editorRef.current?.executeAction(action) ?? {
            action,
            status: "unknown",
          }
        );
      },
      flush,
      getActionState: () =>
        editorRef.current?.getActionState() ?? DEFAULT_BLOCK_EDITOR_ACTION_STATE,
      subscribeActionState: (listener) =>
        editorRef.current?.subscribeActionState(listener) ?? (() => undefined),
    }),
    [flush],
  );

  return (
    <BlockEditorFrame
      ref={editorRef}
      blockId={block.id}
      adornments={adornments}
      editorConfig={editorConfig}
      runtime={runtime}
      initialMarkdown={block.content}
      isExternalEditPending={isExternalEditPending}
      isKept={block.isKept}
      isPinned={block.isPinned}
      isPendingAutoArchive={block.isPendingAutoArchive}
      onBlur={() => {
        void flush();
      }}
      onMarkdownChange={saveMarkdown}
      onFocus={() => {
        onFocus(block.id);
      }}
    />
  );
}
