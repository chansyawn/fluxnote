import { useMutation, useQuery } from "@tanstack/react-query";
import { startTransition, useState } from "react";

import { queryClient } from "@/app/query";
import {
  createBlock,
  createTag,
  deleteBlock,
  deleteTag,
  listBlocks,
  listTags,
  setBlockTags,
  type Block,
  type Tag,
} from "@/clients";
import { blockListQueryKey, tagListQueryKey } from "@/features/note-block/note-query-key";

interface UseBlockWorkspaceResult {
  blocks: Block[];
  tags: Tag[];
  selectedTagIds: string[];
  isLoading: boolean;
  isCreatingBlock: boolean;
  isCreatingTag: boolean;
  deletingBlockId: string | null;
  deletingTagId: string | null;
  toggleTagFilter: (tagId: string) => void;
  createBlock: () => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  createTag: (name: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  setBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
}

function replaceBlockInCaches(updatedBlock: Block): void {
  queryClient.setQueriesData<Block[]>({ queryKey: ["blocks"] }, (current) => {
    if (!current) {
      return current;
    }

    return current.map((block) => (block.id === updatedBlock.id ? updatedBlock : block));
  });
}

export function useBlockWorkspace(): UseBlockWorkspaceResult {
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const blocksQuery = useQuery({
    queryKey: blockListQueryKey(selectedTagIds),
    queryFn: async () =>
      await listBlocks({
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      }),
  });
  const tagsQuery = useQuery({
    queryKey: tagListQueryKey,
    queryFn: listTags,
  });

  const createBlockMutation = useMutation({
    mutationFn: async () => {
      const newBlock = await createBlock();

      if (selectedTagIds.length === 0) {
        return newBlock;
      }

      return await setBlockTags({ blockId: newBlock.id, tagIds: selectedTagIds });
    },
    onSuccess: (newBlock) => {
      startTransition(() => {
        queryClient.setQueryData<Block[]>(blockListQueryKey([]), (current) =>
          current ? [...current, newBlock] : [newBlock],
        );
      });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => await deleteBlock({ blockId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => await createTag({ name }),
    onSuccess: (tag) => {
      startTransition(() => {
        queryClient.setQueryData<Tag[]>(tagListQueryKey, (current) =>
          current
            ? [...current, tag].sort((left, right) => left.name.localeCompare(right.name))
            : [tag],
        );
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => await deleteTag({ tagId }),
    onSuccess: (_, tagId) => {
      startTransition(() => {
        setSelectedTagIds((current) => current.filter((currentTagId) => currentTagId !== tagId));
        queryClient.setQueryData<Tag[]>(
          tagListQueryKey,
          (current) => current?.filter((tag) => tag.id !== tagId) ?? current,
        );
      });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  const setBlockTagsMutation = useMutation({
    mutationFn: async ({ blockId, tagIds }: { blockId: string; tagIds: string[] }) =>
      await setBlockTags({ blockId, tagIds }),
    onSuccess: (updatedBlock) => {
      startTransition(() => {
        replaceBlockInCaches(updatedBlock);
      });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  return {
    blocks: blocksQuery.data ?? [],
    tags: tagsQuery.data ?? [],
    selectedTagIds,
    isLoading: blocksQuery.isPending || tagsQuery.isPending,
    isCreatingBlock: createBlockMutation.isPending,
    isCreatingTag: createTagMutation.isPending,
    deletingBlockId: deleteBlockMutation.variables ?? null,
    deletingTagId: deleteTagMutation.variables ?? null,
    toggleTagFilter: (tagId: string) => {
      setSelectedTagIds((current) =>
        current.includes(tagId)
          ? current.filter((currentTagId) => currentTagId !== tagId)
          : [...current, tagId],
      );
    },
    createBlock: async () => await createBlockMutation.mutateAsync(),
    deleteBlock: async (blockId: string) => {
      await deleteBlockMutation.mutateAsync(blockId);
    },
    createTag: async (name: string) => {
      await createTagMutation.mutateAsync(name);
    },
    deleteTag: async (tagId: string) => {
      await deleteTagMutation.mutateAsync(tagId);
    },
    setBlockTags: async (blockId: string, tagIds: string[]) =>
      await setBlockTagsMutation.mutateAsync({ blockId, tagIds }),
  };
}
