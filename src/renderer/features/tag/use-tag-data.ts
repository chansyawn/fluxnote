import { queryClient } from "@renderer/app/query";
import { createTag, deleteTag, listTags, type Tag } from "@renderer/clients";
import { tagListQueryKey } from "@renderer/features/tag/tag-query-key";
import { useMutation, useMutationState, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export type TagMutationOperation = "create" | "delete";

interface UseTagDataResult {
  tags: Tag[];
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (tagId: string) => Promise<void>;
  isTagOpPending: (op: TagMutationOperation, tagId?: string) => boolean;
}

function usePendingTagOperationState() {
  const pendingTagCreateCount = useMutationState({
    filters: { mutationKey: ["tags", "create"], status: "pending" },
    select: () => true,
  }).length;
  const pendingDeleteTagIds = useMutationState<string>({
    filters: { mutationKey: ["tags", "delete"], status: "pending" },
    select: (mutation) => mutation.state.variables as string,
  });

  return useMemo(
    () => ({
      createCount: pendingTagCreateCount,
      deleteTagIds: new Set(pendingDeleteTagIds),
    }),
    [pendingDeleteTagIds, pendingTagCreateCount],
  );
}

export function useTagData(): UseTagDataResult {
  const tagsQuery = useQuery({
    queryKey: tagListQueryKey,
    queryFn: listTags,
  });

  const createTagMutation = useMutation({
    mutationKey: ["tags", "create"],
    mutationFn: async (name: string) => await createTag({ name }),
    onSuccess: (_data, _variables, _context) => {
      void tagsQuery.refetch();
    },
    onError: (error) => {
      console.error("Failed to create tag.", error);
      toast.error("Failed to create tag.");
    },
  });

  const deleteTagMutation = useMutation({
    mutationKey: ["tags", "delete"],
    mutationFn: async (tagId: string) => await deleteTag({ tagId }),
    onSuccess: () => {
      void tagsQuery.refetch();
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
    onError: (error) => {
      console.error("Failed to delete tag.", error);
      toast.error("Failed to delete tag.");
    },
  });

  const pendingState = usePendingTagOperationState();

  const stableCreateTag = useCallback(
    (name: string) => createTagMutation.mutateAsync(name),
    [createTagMutation.mutateAsync],
  );
  const stableDeleteTag = useCallback(
    async (tagId: string) => {
      await deleteTagMutation.mutateAsync(tagId);
    },
    [deleteTagMutation.mutateAsync],
  );

  return {
    tags: tagsQuery.data ?? [],
    createTag: stableCreateTag,
    deleteTag: stableDeleteTag,
    isTagOpPending: (op: TagMutationOperation, tagId?: string) => {
      if (op === "create") {
        return pendingState.createCount > 0;
      }

      if (!tagId) {
        return pendingState.deleteTagIds.size > 0;
      }

      return pendingState.deleteTagIds.has(tagId);
    },
  };
}
