import { queryClient } from "@renderer/app/query";
import { type Block, updateBlockContent } from "@renderer/clients";
import { NoteBlockEditorView } from "@renderer/features/note-block/note-block-editor-view";
import { type NoteEditorShellHandle } from "@renderer/features/note-editor-core";
import { useMutation } from "@tanstack/react-query";
import {
  forwardRef,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";
import { useDebouncedCallback } from "use-debounce";

interface NoteBlockEditorProps {
  block: Block;
  actions?: ReactNode;
  isExternalEditPending?: boolean;
  leadingActions?: ReactNode;
  onFocus: (blockId: string) => void;
}

export interface NoteBlockEditorHandle extends NoteEditorShellHandle {
  flushPendingMarkdown: () => Promise<string>;
}

function updateBlockInCache(updatedBlock: Block): void {
  queryClient.setQueriesData<Block[]>({ queryKey: ["blocks"] }, (current) => {
    if (!current) {
      return current;
    }

    return current.map((block) => (block.id === updatedBlock.id ? updatedBlock : block));
  });
}

export const NoteBlockEditor = forwardRef<NoteBlockEditorHandle, NoteBlockEditorProps>(
  function NoteBlockEditor(
    { block, actions, isExternalEditPending = false, leadingActions, onFocus },
    ref,
  ) {
    const editorShellRef = useRef<NoteEditorShellHandle | null>(null);
    const latestContentRef = useRef(block.content);
    const persistedContentRef = useRef(block.content);
    const latestRequestIdRef = useRef(0);
    const appliedRequestIdRef = useRef(0);
    const savePromiseRef = useRef<Promise<void> | null>(null);

    useEffect(() => {
      latestContentRef.current = block.content;
      persistedContentRef.current = block.content;
      latestRequestIdRef.current = 0;
      appliedRequestIdRef.current = 0;
      savePromiseRef.current = null;
    }, [block.id, block.content]);

    const saveMutation = useMutation({
      mutationFn: async ({ content, requestId }: { content: string; requestId: number }) => ({
        requestId,
        updatedBlock: await updateBlockContent({
          blockId: block.id,
          content,
        }),
      }),
    });

    const handleSaveSuccess = useEffectEvent(
      ({ requestId, updatedBlock }: { requestId: number; updatedBlock: Block }) => {
        if (requestId < appliedRequestIdRef.current) {
          return;
        }

        appliedRequestIdRef.current = requestId;
        persistedContentRef.current = updatedBlock.content;
        updateBlockInCache(updatedBlock);
      },
    );

    const handleSaveError = useEffectEvent(() => {
      // Save errors are intentionally silent in the simplified MVP UI.
    });

    const runSave = useEffectEvent((content: string) => {
      const requestId = latestRequestIdRef.current + 1;
      latestRequestIdRef.current = requestId;

      const savePromise = saveMutation
        .mutateAsync({ content, requestId })
        .then(handleSaveSuccess)
        .catch(handleSaveError);
      savePromiseRef.current = savePromise;
      void savePromise.finally(() => {
        if (savePromiseRef.current === savePromise) {
          savePromiseRef.current = null;
        }
      });
    });

    const debouncedSave = useDebouncedCallback(
      (content: string) => {
        runSave(content);
      },
      600,
      { flushOnExit: true },
    );

    const handleMarkdownUpdated = useEffectEvent((markdown: string) => {
      latestContentRef.current = markdown;

      if (markdown === persistedContentRef.current) {
        debouncedSave.cancel();
        return;
      }

      debouncedSave(markdown);
    });

    const flushPendingSave = useEffectEvent(() => {
      debouncedSave.flush();
    });

    const flushPendingMarkdown = useEffectEvent(async () => {
      debouncedSave.flush();
      await savePromiseRef.current;
      return latestContentRef.current;
    });

    useImperativeHandle(ref, () => ({
      copyContent: async () => {
        await editorShellRef.current?.copyContent();
      },
      flushPendingMarkdown,
      focus: () => {
        editorShellRef.current?.focus();
      },
    }));

    return (
      <NoteBlockEditorView
        blockId={block.id}
        ref={editorShellRef}
        initialMarkdown={block.content}
        isExternalEditPending={isExternalEditPending}
        leadingActions={leadingActions}
        willArchive={block.willArchive}
        actions={actions}
        onBlur={flushPendingSave}
        onMarkdownUpdated={handleMarkdownUpdated}
        onFocus={() => {
          onFocus(block.id);
        }}
      />
    );
  },
);
