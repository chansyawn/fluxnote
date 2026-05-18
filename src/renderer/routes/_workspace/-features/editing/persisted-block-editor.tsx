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

export type PersistedBlockEditorHandle = BlockEditorHandle;

interface BlockEditorFrameProps {
  blockId: string;
  editorConfig?: BlockEditorConfigInput;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  isKept: boolean;
  leadingActions?: ReactNode;
  runtime: BlockEditorRuntime;
  willArchive: boolean;
  actions?: ReactNode;
  onMarkdownChange: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  ref?: Ref<BlockEditorHandle>;
}

function BlockEditorFrame({
  blockId,
  editorConfig,
  initialMarkdown,
  isExternalEditPending = false,
  isKept,
  leadingActions,
  runtime,
  willArchive,
  actions,
  onMarkdownChange,
  onBlur,
  onFocus,
  ref,
}: BlockEditorFrameProps) {
  return (
    <article
      className={cn(
        "group bg-card relative rounded-xl border transition-opacity",
        isKept ? "border-ring/80" : "border-border",
        isExternalEditPending && "border-dashed",
        willArchive && "opacity-60",
      )}
      data-block-id={blockId}
      onFocusCapture={onFocus}
    >
      {actions ? (
        <div className="pointer-events-none absolute top-0 right-1 z-10 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
      {leadingActions ? (
        <div className="absolute top-0 left-1 z-10 -translate-y-1/2">{leadingActions}</div>
      ) : null}

      <div className="min-h-16 px-3 pt-3 pb-2">
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

interface PersistedBlockEditorProps {
  block: Block;
  actions?: ReactNode;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  onFocus: (blockId: string) => void;
  ref?: Ref<PersistedBlockEditorHandle>;
}

export function PersistedBlockEditor({
  block,
  actions,
  isExternalEditPending = false,
  leadingActions,
  onFocus,
  ref,
}: PersistedBlockEditorProps) {
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
      editorConfig={editorConfig}
      runtime={runtime}
      initialMarkdown={block.content}
      isExternalEditPending={isExternalEditPending}
      isKept={block.isKept}
      leadingActions={leadingActions}
      willArchive={block.willArchive}
      actions={actions}
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
