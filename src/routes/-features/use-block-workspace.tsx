import { useMutation, useQuery } from "@tanstack/react-query";
import { createContext, startTransition, useContext, useState, type ReactNode } from "react";

import { queryClient } from "@/app/query";
import {
  archiveBlock,
  createBlock,
  createTag,
  deleteBlock,
  deleteTag,
  listBlocks,
  listTags,
  restoreBlock,
  setBlockTags,
  type Block,
  type BlockVisibility,
  type Tag,
} from "@/clients";
import { blockListQueryKey, tagListQueryKey } from "@/features/note-block/note-query-key";

interface BlockWorkspaceState {
  blocks: Block[];
  tags: Tag[];
  visibility: BlockVisibility;
  selectedTagIds: string[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isCreatingBlock: boolean;
  isCreatingTag: boolean;
  archivingBlockId: string | null;
  restoringBlockId: string | null;
  deletingBlockId: string | null;
  deletingTagId: string | null;
  setVisibility: (visibility: BlockVisibility) => void;
  setSelectedTagFilters: (tagIds: string[]) => void;
  createBlock: () => Promise<Block>;
  archiveBlock: (blockId: string) => Promise<Block>;
  restoreBlock: (blockId: string) => Promise<Block>;
  deleteBlock: (blockId: string) => Promise<void>;
  createTag: (name: string) => Promise<void>;
  createTagAndSelectForFilter: (name: string) => Promise<void>;
  createTagAndAssignToBlock: (blockId: string, name: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
}

const BlockWorkspaceContext = createContext<BlockWorkspaceState | null>(null);

function replaceBlockInCaches(updatedBlock: Block): void {
  queryClient.setQueriesData<Block[]>({ queryKey: ["blocks"] }, (current) => {
    if (!current) {
      return current;
    }

    return current.map((block) => (block.id === updatedBlock.id ? updatedBlock : block));
  });
}

export function BlockWorkspaceProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<BlockVisibility>("active");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const blocksQuery = useQuery({
    queryKey: blockListQueryKey(selectedTagIds, visibility),
    queryFn: async () =>
      await listBlocks({
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        visibility,
      }),
    placeholderData: (previousData) => previousData,
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
        queryClient.setQueryData<Block[]>(blockListQueryKey([], "active"), (current) =>
          current ? [...current, newBlock] : [newBlock],
        );
      });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  const archiveBlockMutation = useMutation({
    mutationFn: async (blockId: string) => await archiveBlock({ blockId }),
    onSuccess: (updatedBlock) => {
      startTransition(() => {
        replaceBlockInCaches(updatedBlock);
      });
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  const restoreBlockMutation = useMutation({
    mutationFn: async (blockId: string) => await restoreBlock({ blockId }),
    onSuccess: (updatedBlock) => {
      startTransition(() => {
        replaceBlockInCaches(updatedBlock);
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

  const contextValue: BlockWorkspaceState = {
    blocks: blocksQuery.data ?? [],
    tags: tagsQuery.data ?? [],
    visibility,
    selectedTagIds,
    isInitialLoading: blocksQuery.data === undefined || tagsQuery.data === undefined,
    isRefreshing: blocksQuery.isFetching || tagsQuery.isFetching,
    isCreatingBlock: createBlockMutation.isPending,
    isCreatingTag: createTagMutation.isPending,
    archivingBlockId: archiveBlockMutation.variables ?? null,
    restoringBlockId: restoreBlockMutation.variables ?? null,
    deletingBlockId: deleteBlockMutation.variables ?? null,
    deletingTagId: deleteTagMutation.variables ?? null,
    setVisibility,
    setSelectedTagFilters: (tagIds: string[]) => {
      setSelectedTagIds(tagIds);
    },
    createBlock: async () => await createBlockMutation.mutateAsync(),
    archiveBlock: async (blockId: string) => await archiveBlockMutation.mutateAsync(blockId),
    restoreBlock: async (blockId: string) => await restoreBlockMutation.mutateAsync(blockId),
    deleteBlock: async (blockId: string) => {
      await deleteBlockMutation.mutateAsync(blockId);
    },
    createTag: async (name: string) => {
      await createTagMutation.mutateAsync(name);
    },
    createTagAndSelectForFilter: async (name: string) => {
      const createdTag = await createTagMutation.mutateAsync(name);
      setSelectedTagIds((current) => {
        if (current.includes(createdTag.id)) {
          return current;
        }

        return [...current, createdTag.id];
      });
    },
    createTagAndAssignToBlock: async (blockId: string, name: string) => {
      const createdTag = await createTagMutation.mutateAsync(name);
      const targetBlock = blocksQuery.data?.find((block) => block.id === blockId);
      const nextTagIds = targetBlock
        ? [...new Set([...targetBlock.tags.map((tag) => tag.id), createdTag.id])]
        : [createdTag.id];

      await setBlockTagsMutation.mutateAsync({ blockId, tagIds: nextTagIds });
    },
    deleteTag: async (tagId: string) => {
      await deleteTagMutation.mutateAsync(tagId);
    },
    assignBlockTags: async (blockId: string, tagIds: string[]) =>
      await setBlockTagsMutation.mutateAsync({ blockId, tagIds }),
  };

  return (
    <BlockWorkspaceContext.Provider value={contextValue}>{children}</BlockWorkspaceContext.Provider>
  );
}

export function useBlockWorkspace() {
  const context = useContext(BlockWorkspaceContext);

  if (!context) {
    throw new Error("useBlockWorkspace must be used within BlockWorkspaceProvider");
  }

  return context;
}
