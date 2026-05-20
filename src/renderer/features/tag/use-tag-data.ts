import {
  createTag,
  deleteTag,
  listTags,
  updateTag,
  type Tag,
  type UpdateTagRequest,
} from "@renderer/clients";
import { refreshBlocks } from "@renderer/features/blocks/block-query";
import { tagListQueryKey } from "@renderer/features/tag/tag-query-key";
import { useMutation, useMutationState, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { getDefaultTagColor } from "./tag-color";

export type TagMutationOperation = "create" | "delete" | "update";

interface UseTagDataResult {
  tags: Tag[];
  createTag: (name: string) => Promise<Tag>;
  deleteTag: (tagId: string) => Promise<void>;
  updateTag: (req: UpdateTagRequest) => Promise<Tag>;
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
  const pendingUpdateTagIds = useMutationState<string>({
    filters: { mutationKey: ["tags", "update"], status: "pending" },
    select: (mutation) => (mutation.state.variables as UpdateTagRequest).tagId,
  });

  return useMemo(
    () => ({
      createCount: pendingTagCreateCount,
      deleteTagIds: new Set(pendingDeleteTagIds),
      updateTagIds: new Set(pendingUpdateTagIds),
    }),
    [pendingDeleteTagIds, pendingTagCreateCount, pendingUpdateTagIds],
  );
}

export function useTagData(): UseTagDataResult {
  const tagsQuery = useQuery({
    queryKey: tagListQueryKey,
    queryFn: listTags,
  });

  const createTagMutation = useMutation({
    mutationKey: ["tags", "create"],
    mutationFn: async (name: string) => await createTag({ name, color: getDefaultTagColor(name) }),
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
      refreshBlocks();
    },
    onError: (error) => {
      console.error("Failed to delete tag.", error);
      toast.error("Failed to delete tag.");
    },
  });

  const updateTagMutation = useMutation({
    mutationKey: ["tags", "update"],
    mutationFn: async (req: UpdateTagRequest) => await updateTag(req),
    onSuccess: () => {
      void tagsQuery.refetch();
      refreshBlocks();
    },
    onError: (error) => {
      console.error("Failed to update tag.", error);
      toast.error("Failed to update tag.");
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
  const stableUpdateTag = useCallback(
    (req: UpdateTagRequest) => updateTagMutation.mutateAsync(req),
    [updateTagMutation.mutateAsync],
  );

  return {
    tags: tagsQuery.data ?? [],
    createTag: stableCreateTag,
    deleteTag: stableDeleteTag,
    updateTag: stableUpdateTag,
    isTagOpPending: (op: TagMutationOperation, tagId?: string) => {
      if (op === "create") {
        return pendingState.createCount > 0;
      }

      if (!tagId) {
        return op === "delete"
          ? pendingState.deleteTagIds.size > 0
          : pendingState.updateTagIds.size > 0;
      }

      return op === "delete"
        ? pendingState.deleteTagIds.has(tagId)
        : pendingState.updateTagIds.has(tagId);
    },
  };
}
