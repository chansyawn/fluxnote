import { type Block } from "@renderer/clients";
import { type BlockEditorHandle } from "@renderer/features/block-editor";
import { BlockEditorView } from "@renderer/features/block/block-editor-view";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
  type Ref,
} from "react";

import { createBlockEditorRuntime } from "./runtime";
import { useBlockContentPersistence } from "./use-block-content-persistence";

interface BlockEditorControllerProps {
  block: Block;
  actions?: ReactNode;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  onFocus: (blockId: string) => void;
  ref?: Ref<BlockEditorControllerHandle>;
}

export type BlockEditorControllerHandle = BlockEditorHandle;

export function BlockEditorController({
  block,
  actions,
  isExternalEditPending = false,
  leadingActions,
  onFocus,
  ref,
}: BlockEditorControllerProps) {
  const editorShellRef = useRef<BlockEditorHandle | null>(null);
  const runtime = useMemo(() => createBlockEditorRuntime(block.id), [block.id]);
  const { getLatestContent, saveMarkdown, snapshotLatestContent, waitForPendingSave } =
    useBlockContentPersistence(block);

  useEffect(() => {
    return () => {
      void editorShellRef.current?.flush();
      snapshotLatestContent();
    };
  }, [snapshotLatestContent]);

  const flush = useCallback(async () => {
    const markdown = (await editorShellRef.current?.flush()) ?? getLatestContent();
    await waitForPendingSave();
    return markdown;
  }, [getLatestContent, waitForPendingSave]);

  const flushPendingContent = useCallback(() => {
    void flush();
  }, [flush]);

  useImperativeHandle(
    ref,
    () => ({
      copy: async () => {
        await editorShellRef.current?.copy();
      },
      focus: () => {
        editorShellRef.current?.focus();
      },
      flush,
    }),
    [flush],
  );

  return (
    <BlockEditorView
      blockId={block.id}
      ref={editorShellRef}
      runtime={runtime}
      initialMarkdown={block.content}
      isExternalEditPending={isExternalEditPending}
      leadingActions={leadingActions}
      willArchive={block.willArchive}
      actions={actions}
      onBlur={flushPendingContent}
      onMarkdownChange={saveMarkdown}
      onFocus={() => {
        onFocus(block.id);
      }}
    />
  );
}
