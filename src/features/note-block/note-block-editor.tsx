import { Trans } from "@lingui/react/macro";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";
import { useEffect, useEffectEvent, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";

import { queryClient } from "@/app/query";
import { type NoteBlock, type NoteDetail, updateNoteBlockContent } from "@/clients";
import { NoteBlockCoreEditor } from "@/features/note-block/note-block-core-editor";
import { noteDetailQueryKey } from "@/features/note-block/note-query-key";
import { Button } from "@/ui/components/button";

interface NoteBlockEditorProps {
  noteId: string;
  block: NoteBlock;
  isDeleting: boolean;
  isOnlyBlock: boolean;
  onDelete: (block: NoteBlock) => Promise<void>;
}

function updateBlockInCache(noteId: string, updatedBlock: NoteBlock): void {
  queryClient.setQueryData<NoteDetail>(noteDetailQueryKey(noteId), (current) => {
    if (!current) {
      return current;
    }

    return {
      ...current,
      note: {
        ...current.note,
        updatedAt: updatedBlock.updatedAt,
      },
      blocks: current.blocks.map((block) => (block.id === updatedBlock.id ? updatedBlock : block)),
    };
  });
}

export function NoteBlockEditor({
  noteId,
  block,
  isDeleting,
  isOnlyBlock,
  onDelete,
}: NoteBlockEditorProps) {
  const latestContentRef = useRef(block.content);
  const persistedContentRef = useRef(block.content);
  const latestRequestIdRef = useRef(0);
  const appliedRequestIdRef = useRef(0);

  useEffect(() => {
    latestContentRef.current = block.content;
    persistedContentRef.current = block.content;
    latestRequestIdRef.current = 0;
    appliedRequestIdRef.current = 0;
  }, [block.id, block.content]);

  const saveMutation = useMutation({
    mutationFn: async ({ content, requestId }: { content: string; requestId: number }) => ({
      requestId,
      updatedBlock: await updateNoteBlockContent({
        blockId: block.id,
        content,
      }),
    }),
  });

  const handleSaveSuccess = useEffectEvent(
    ({ requestId, updatedBlock }: { requestId: number; updatedBlock: NoteBlock }) => {
      if (requestId < appliedRequestIdRef.current) {
        return;
      }

      appliedRequestIdRef.current = requestId;
      persistedContentRef.current = updatedBlock.content;
      updateBlockInCache(noteId, updatedBlock);
    },
  );

  const handleSaveError = useEffectEvent(() => {
    // Save errors are intentionally silent in the simplified MVP UI.
  });

  const runSave = useEffectEvent((content: string) => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;

    void saveMutation
      .mutateAsync({ content, requestId })
      .then(handleSaveSuccess)
      .catch(handleSaveError);
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

  return (
    <article className="border-border/60 bg-background/20 rounded-xl border">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="bg-primary/12 text-primary inline-flex min-w-10 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold backdrop-blur-sm">
          #{block.position + 1}
        </div>

        <Button
          size="icon"
          variant="ghost"
          disabled={isOnlyBlock || isDeleting}
          onClick={() => {
            void onDelete(block);
          }}
        >
          {isDeleting ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
          <span className="sr-only">
            <Trans id="home-note.block.delete">Delete block</Trans>
          </span>
        </Button>
      </div>

      <div className="min-h-28 px-4 pb-4">
        <NoteBlockCoreEditor
          initialMarkdown={block.content}
          editorKey={block.id}
          onBlur={flushPendingSave}
          onMarkdownUpdated={handleMarkdownUpdated}
        />
      </div>
    </article>
  );
}
