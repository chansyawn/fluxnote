import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircleIcon, LoaderCircleIcon, PlusIcon } from "lucide-react";
import { startTransition } from "react";

import { AppInvokeError } from "@/app/invoke";
import { queryClient } from "@/app/query";
import {
  createNoteBlock,
  deleteNoteBlock,
  getHomeNote,
  type HomeNote,
  type NoteBlock,
} from "@/clients";
import { NoteBlockEditor } from "@/features/note/note-block-editor";
import { Button } from "@/ui/components/button";

export const homeNoteQueryKey = ["notes", "home"] as const;

function updateHomeNoteCache(updater: (current: HomeNote) => HomeNote): void {
  queryClient.setQueryData<HomeNote>(homeNoteQueryKey, (current) => {
    if (!current) {
      return current;
    }

    return updater(current);
  });
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof AppInvokeError) {
    return `${error.type}: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function HomeNoteScreen() {
  const homeNoteQuery = useQuery({
    queryKey: homeNoteQueryKey,
    queryFn: getHomeNote,
  });

  const createBlockMutation = useMutation({
    mutationFn: async (noteId: string) => await createNoteBlock({ noteId }),
    onSuccess: (newBlock) => {
      startTransition(() => {
        updateHomeNoteCache((current) => ({
          ...current,
          blocks: [...current.blocks, newBlock],
          note: {
            ...current.note,
            updatedAt: newBlock.updatedAt,
          },
        }));
      });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => await deleteNoteBlock({ blockId }),
    onSuccess: ({ deletedBlockId }) => {
      startTransition(() => {
        updateHomeNoteCache((current) => {
          const remainingBlocks = current.blocks
            .filter((block) => block.id !== deletedBlockId)
            .map((block, index) => ({
              ...block,
              position: index,
            }));

          return {
            ...current,
            blocks: remainingBlocks,
          };
        });
      });
    },
  });

  if (homeNoteQuery.isPending) {
    return (
      <section className="mx-auto flex min-h-[45dvh] w-full max-w-4xl items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          <Trans id="home-note.loading">Loading your note...</Trans>
        </div>
      </section>
    );
  }

  if (homeNoteQuery.isError || !homeNoteQuery.data) {
    return (
      <section className="mx-auto flex min-h-[45dvh] w-full max-w-3xl items-center justify-center">
        <div className="border-border/70 bg-card flex w-full max-w-lg flex-col gap-3 rounded-2xl border p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <AlertCircleIcon className="size-4" />
            <Trans id="home-note.error.title">Failed to load note</Trans>
          </div>
          <p className="text-muted-foreground text-sm">{formatErrorMessage(homeNoteQuery.error)}</p>
          <div>
            <Button
              variant="outline"
              onClick={() => {
                void homeNoteQuery.refetch();
              }}
            >
              <Trans id="home-note.error.retry">Retry</Trans>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const homeNote = homeNoteQuery.data;
  const deletingBlockId = deleteBlockMutation.variables ?? null;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        {homeNote.blocks.map((block) => (
          <NoteBlockEditor
            key={block.id}
            block={block}
            isDeleting={deleteBlockMutation.isPending && deletingBlockId === block.id}
            isOnlyBlock={homeNote.blocks.length === 1}
            onDelete={async (targetBlock: NoteBlock) => {
              await deleteBlockMutation.mutateAsync(targetBlock.id);
            }}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          className="gap-2"
          disabled={createBlockMutation.isPending}
          onClick={() => {
            void createBlockMutation.mutateAsync(homeNote.note.id);
          }}
        >
          {createBlockMutation.isPending ? (
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
