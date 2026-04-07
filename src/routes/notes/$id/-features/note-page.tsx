import { Trans } from "@lingui/react/macro";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";

import { NoteBlockEditor } from "@/features/note-block/note-block-editor";
import { useNotePage } from "@/routes/notes/$id/-features/use-note-page";
import { Button } from "@/ui/components/button";

interface NotePageProps {
  noteId: string;
  onMissingNote: () => Promise<void>;
}

function LoadingState(): ReactElement {
  return (
    <section className="mx-auto flex min-h-[45dvh] w-full max-w-4xl items-center justify-center">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        <Trans id="home-note.loading">Loading your note...</Trans>
      </div>
    </section>
  );
}

export function NotePage({ noteId, onMissingNote }: NotePageProps) {
  const { noteDetail, isLoading, isCreatingBlock, deletingBlockId, createBlock, deleteBlock } =
    useNotePage({
      noteId,
      onMissingNote,
    });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!noteDetail) {
    return null;
  }
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        {noteDetail.blocks.map((block) => (
          <NoteBlockEditor
            key={block.id}
            noteId={noteId}
            block={block}
            isDeleting={deletingBlockId === block.id}
            isOnlyBlock={noteDetail.blocks.length === 1}
            onDelete={async (blockId: string) => {
              await deleteBlock(blockId);
            }}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          className="gap-2"
          disabled={isCreatingBlock}
          onClick={() => {
            void createBlock(noteDetail.note.id);
          }}
        >
          {isCreatingBlock ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <PlusIcon className="size-4" />
          )}
          <Trans id="home-note.add-block">Add block</Trans>
        </Button>
      </div>
    </section>
  );
}
