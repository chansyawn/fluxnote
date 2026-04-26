import { queryClient } from "@renderer/app/query";
import type {
  Block,
  BlockVisibility,
  ListBlocksResult,
  LocateBlockResult,
} from "@renderer/clients";
import type { Tag } from "@renderer/clients/tags";
import {
  type BlockMutationOperation,
  type TagMutationOperation,
  useWorkspaceData,
} from "@renderer/routes/-features/use-workspace-data";
import { useWorkspaceViewState } from "@renderer/routes/-features/use-workspace-view-state";
import { createContext, useCallback, useContext, type ReactNode } from "react";

interface BlockWorkspaceState {
  loadedBlocks: Block[];
  totalBlockCount: number;
  tags: Tag[];
  visibility: BlockVisibility;
  selectedTagIds: string[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isCreatingBlock: boolean;
  isBlockLocked: (blockId: string) => boolean;
  isBlockOpPending: (blockId: string, op: BlockMutationOperation) => boolean;
  isTagOpPending: (op: TagMutationOperation, tagId?: string) => boolean;
  getBlockAtIndex: (index: number) => Block | undefined;
  ensureBlockIndex: (index: number) => void;
  ensureBlockIndexLoaded: (index: number) => Promise<void>;
  locateBlockInView: (blockId: string) => Promise<LocateBlockResult>;
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

export function BlockWorkspaceProvider({ children }: { children: ReactNode }) {
  const viewState = useWorkspaceViewState();
  const data = useWorkspaceData({
    selectedTagIds: viewState.selectedTagIds,
    visibility: viewState.visibility,
  });

  const stableCreateTag = useCallback(
    async (name: string) => {
      await data.createTag(name);
    },
    [data.createTag],
  );

  const createTagAndSelectForFilter = useCallback(
    async (name: string) => {
      const createdTag = await data.createTag(name);
      viewState.setSelectedTagIds((currentTagIds) => {
        if (currentTagIds.includes(createdTag.id)) {
          return currentTagIds;
        }

        return [...currentTagIds, createdTag.id];
      });
    },
    [data.createTag, viewState.setSelectedTagIds],
  );

  const createTagAndAssignToBlock = useCallback(
    async (blockId: string, name: string) => {
      const createdTag = await data.createTag(name);
      let targetBlock: Block | undefined;
      for (const [, page] of queryClient.getQueriesData<ListBlocksResult>({
        queryKey: ["blocks"],
      })) {
        targetBlock = page?.blocks.find((b) => b.id === blockId);
        if (targetBlock) break;
      }
      const nextTagIds = targetBlock
        ? [...new Set([...targetBlock.tags.map((tag) => tag.id), createdTag.id])]
        : [createdTag.id];

      await data.assignBlockTags(blockId, nextTagIds);
    },
    [data.createTag, data.assignBlockTags],
  );

  const stableDeleteTag = useCallback(
    async (tagId: string) => {
      await data.deleteTag(tagId);
      viewState.setSelectedTagIds((currentTagIds) =>
        currentTagIds.filter((currentTagId) => currentTagId !== tagId),
      );
    },
    [data.deleteTag, viewState.setSelectedTagIds],
  );

  const contextValue: BlockWorkspaceState = {
    loadedBlocks: data.loadedBlocks,
    totalBlockCount: data.totalBlockCount,
    tags: data.tags,
    visibility: viewState.visibility,
    selectedTagIds: viewState.selectedTagIds,
    isInitialLoading: data.isInitialLoading,
    isRefreshing: data.isRefreshing,
    isCreatingBlock: data.isCreatingBlock,
    isBlockLocked: data.isBlockLocked,
    isBlockOpPending: data.isBlockOpPending,
    isTagOpPending: data.isTagOpPending,
    getBlockAtIndex: data.getBlockAtIndex,
    ensureBlockIndex: data.ensureBlockIndex,
    ensureBlockIndexLoaded: data.ensureBlockIndexLoaded,
    locateBlockInView: data.locateBlockInView,
    setVisibility: viewState.setVisibility,
    setSelectedTagFilters: viewState.setSelectedTagIds,
    createBlock: data.createBlock,
    archiveBlock: data.archiveBlock,
    restoreBlock: data.restoreBlock,
    deleteBlock: data.deleteBlock,
    createTag: stableCreateTag,
    createTagAndSelectForFilter,
    createTagAndAssignToBlock,
    deleteTag: stableDeleteTag,
    assignBlockTags: data.assignBlockTags,
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
