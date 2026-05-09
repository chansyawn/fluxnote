import { type Block } from "@renderer/clients";
import {
  BlockEditor,
  type BlockEditorHandle,
  type BlockEditorRuntime,
} from "@renderer/features/block-editor";
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

import { useBlockPersistence } from "./persistence";
import { createBlockRuntime } from "./runtime";

export type BlockEditorControllerHandle = BlockEditorHandle;

interface BlockEditorViewProps {
  blockId: string;
  initialMarkdown: string;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  runtime: BlockEditorRuntime;
  willArchive: boolean;
  actions?: ReactNode;
  onMarkdownChange: (markdown: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  ref?: Ref<BlockEditorHandle>;
}

export function BlockEditorView({
  blockId,
  initialMarkdown,
  isExternalEditPending = false,
  leadingActions,
  runtime,
  willArchive,
  actions,
  onMarkdownChange,
  onBlur,
  onFocus,
  ref,
}: BlockEditorViewProps) {
  return (
    <article
      className={cn(
        "group border-border bg-card relative rounded-xl border transition-opacity",
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
          onBlur={onBlur}
          onMarkdownChange={onMarkdownChange}
        />
      </div>
    </article>
  );
}

interface BlockEditorControllerProps {
  block: Block;
  actions?: ReactNode;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  onFocus: (blockId: string) => void;
  ref?: Ref<BlockEditorControllerHandle>;
}

export function BlockEditorController({
  block,
  actions,
  isExternalEditPending = false,
  leadingActions,
  onFocus,
  ref,
}: BlockEditorControllerProps) {
  const editorRef = useRef<BlockEditorHandle | null>(null);
  const runtime = useMemo(() => createBlockRuntime(block.id), [block.id]);
  const { getLatestContent, saveMarkdown, snapshotLatestContent, waitForPendingSave } =
    useBlockPersistence(block);

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
    <BlockEditorView
      ref={editorRef}
      blockId={block.id}
      runtime={runtime}
      initialMarkdown={block.content}
      isExternalEditPending={isExternalEditPending}
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
