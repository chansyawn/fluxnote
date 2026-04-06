import { useMutation, useQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useRef } from "react";

import { AppInvokeError } from "@/app/invoke";
import { queryClient } from "@/app/query";
import {
  createNoteBlock,
  deleteNoteBlock,
  getNoteById,
  type NoteBlock,
  type NoteDetail,
} from "@/clients";
import { noteDetailQueryKey } from "@/features/note-block/note-query-key";

function updateNoteDetailCache(noteId: string, updater: (current: NoteDetail) => NoteDetail): void {
  queryClient.setQueryData<NoteDetail>(noteDetailQueryKey(noteId), (current) => {
    if (!current) {
      return current;
    }

    return updater(current);
  });
}

function isNoteNotFoundError(error: unknown): boolean {
  return error instanceof AppInvokeError && error.type === "BUSINESS.NOT_FOUND";
}

interface UseNotePageParams {
  noteId: string;
  onMissingNote: () => Promise<void>;
}

interface UseNotePageResult {
  noteDetail: NoteDetail | null;
  isLoading: boolean;
  isCreatingBlock: boolean;
  deletingBlockId: string | null;
  createBlock: (noteId: string) => Promise<NoteBlock>;
  deleteBlock: (blockId: string) => Promise<void>;
}

export function useNotePage({ noteId, onMissingNote }: UseNotePageParams): UseNotePageResult {
  const didRedirectRef = useRef(false);
  const noteDetailQuery = useQuery({
    queryKey: noteDetailQueryKey(noteId),
    queryFn: async () => await getNoteById({ noteId }),
  });

  const createBlockMutation = useMutation({
    mutationFn: async (targetNoteId: string) => await createNoteBlock({ noteId: targetNoteId }),
    onSuccess: (newBlock) => {
      startTransition(() => {
        updateNoteDetailCache(noteId, (current) => ({
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
        updateNoteDetailCache(noteId, (current) => {
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

  useEffect(() => {
    if (!noteDetailQuery.isError || !isNoteNotFoundError(noteDetailQuery.error)) {
      didRedirectRef.current = false;
      return;
    }

    if (didRedirectRef.current) {
      return;
    }

    didRedirectRef.current = true;
    void onMissingNote();
  }, [noteDetailQuery.error, noteDetailQuery.isError, onMissingNote]);

  const isMissingNote = noteDetailQuery.isError && isNoteNotFoundError(noteDetailQuery.error);

  return {
    noteDetail: noteDetailQuery.data ?? null,
    isLoading: noteDetailQuery.isPending || isMissingNote,
    isCreatingBlock: createBlockMutation.isPending,
    deletingBlockId: deleteBlockMutation.variables ?? null,
    createBlock: async (targetNoteId: string) =>
      await createBlockMutation.mutateAsync(targetNoteId),
    deleteBlock: async (blockId: string) => {
      await deleteBlockMutation.mutateAsync(blockId);
    },
  };
}
