import { createContext, useContext, type ReactNode } from "react";

import type { Block, BlockVisibility } from "@/clients";
import type { Tag } from "@/clients/tags";
import {
  type BlockMutationOperation,
  type TagMutationOperation,
  useWorkspaceData,
} from "@/routes/-features/use-workspace-data";
import { useWorkspaceViewState } from "@/routes/-features/use-workspace-view-state";

interface BlockWorkspaceState {
  blocks: Block[];
  tags: Tag[];
  visibility: BlockVisibility;
  selectedTagIds: string[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  isCreatingBlock: boolean;
  isBlockLocked: (blockId: string) => boolean;
  isBlockOpPending: (blockId: string, op: BlockMutationOperation) => boolean;
  isTagOpPending: (op: TagMutationOperation, tagId?: string) => boolean;
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

  const contextValue: BlockWorkspaceState = {
    blocks: data.blocks,
    tags: data.tags,
    visibility: viewState.visibility,
    selectedTagIds: viewState.selectedTagIds,
    isInitialLoading: data.isInitialLoading,
    isRefreshing: data.isRefreshing,
    isCreatingBlock: data.isCreatingBlock,
    isBlockLocked: data.isBlockLocked,
    isBlockOpPending: data.isBlockOpPending,
    isTagOpPending: data.isTagOpPending,
    setVisibility: viewState.setVisibility,
    setSelectedTagFilters: viewState.setSelectedTagIds,
    createBlock: data.createBlock,
    archiveBlock: data.archiveBlock,
    restoreBlock: data.restoreBlock,
    deleteBlock: data.deleteBlock,
    createTag: async (name: string) => {
      await data.createTag(name);
    },
    createTagAndSelectForFilter: async (name: string) => {
      const createdTag = await data.createTag(name);
      viewState.setSelectedTagIds((currentTagIds) => {
        if (currentTagIds.includes(createdTag.id)) {
          return currentTagIds;
        }

        return [...currentTagIds, createdTag.id];
      });
    },
    createTagAndAssignToBlock: async (blockId: string, name: string) => {
      const createdTag = await data.createTag(name);
      const targetBlock = data.blocks.find((block) => block.id === blockId);
      const nextTagIds = targetBlock
        ? [...new Set([...targetBlock.tags.map((tag) => tag.id), createdTag.id])]
        : [createdTag.id];

      await data.assignBlockTags(blockId, nextTagIds);
    },
    deleteTag: async (tagId: string) => {
      await data.deleteTag(tagId);
      viewState.setSelectedTagIds((currentTagIds) =>
        currentTagIds.filter((currentTagId) => currentTagId !== tagId),
      );
    },
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
