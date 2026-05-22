import { type Block } from "@renderer/clients";
import {
  BlockEditor,
  type BlockEditorConfigInput,
  type BlockEditorHandle,
  type BlockEditorRuntime,
} from "@renderer/features/block-editor";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import { cn } from "@renderer/ui/lib/utils";
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

interface BlockEditorFrameProps {
  blockId: string;
  adornments?: ReactNode;
  editorConfig?: BlockEditorConfigInput;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  isKept: boolean;
  isPinned: boolean;
  runtime: BlockEditorRuntime;
  willArchive: boolean;
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
  willArchive,
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
          "opacity-60": willArchive,
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
  onFocus: (blockId: string) => void;
  ref?: Ref<WorkspaceBlockEditorHandle>;
}

export function WorkspaceBlockEditorSurface({
  block,
  adornments,
  isExternalEditPending = false,
  onFocus,
  ref,
}: WorkspaceBlockEditorSurfaceProps) {
  const editorRef = useRef<BlockEditorHandle | null>(null);
  const runtime = useMemo(() => createWorkspaceBlockEditorRuntime(block.id), [block.id]);
  const { codeBlock } = useMarkdownCodeBlockPreference();
  const editorConfig = useMemo<BlockEditorConfigInput>(
    () => ({
      markdown: {
        codeBlock,
      },
    }),
    [codeBlock],
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
      flush,
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
      willArchive={block.willArchive}
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
