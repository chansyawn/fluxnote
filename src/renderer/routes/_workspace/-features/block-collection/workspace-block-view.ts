import type { BlockVisibility } from "@renderer/clients";
import { useCallback, useMemo, useState } from "react";

import type { WorkspaceBlockView } from "./workspace-block-collection";

export interface WorkspaceBlockViewState {
  collectionView: WorkspaceBlockView;
  navigationView: {
    isUnfiltered: (visibility: BlockVisibility) => boolean;
    showUnfiltered: (visibility: BlockVisibility) => void;
    visibility: BlockVisibility;
  };
  selectedTagIds: string[];
  setSelectedTagIds: (tagIds: string[] | ((currentTagIds: string[]) => string[])) => void;
  setVisibility: (visibility: BlockVisibility) => void;
  addTagFilter: (tagId: string) => void;
  removeTagFilter: (tagId: string) => void;
  visibility: BlockVisibility;
}

export function useWorkspaceBlockView(): WorkspaceBlockViewState {
  const [visibility, setVisibility] = useState<BlockVisibility>("active");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const addTagFilter = useCallback((tagId: string) => {
    setSelectedTagIds((currentTagIds) => {
      if (currentTagIds.includes(tagId)) {
        return currentTagIds;
      }
      return [...currentTagIds, tagId];
    });
  }, []);

  const removeTagFilter = useCallback((tagId: string) => {
    setSelectedTagIds((currentTagIds) => currentTagIds.filter((id) => id !== tagId));
  }, []);

  const collectionView = useMemo(
    () => ({ visibility, tagIds: selectedTagIds }),
    [selectedTagIds, visibility],
  );

  const navigationView = useMemo(
    () => ({
      isUnfiltered: (nextVisibility: BlockVisibility) =>
        visibility === nextVisibility && selectedTagIds.length === 0,
      showUnfiltered: (nextVisibility: BlockVisibility) => {
        if (visibility !== nextVisibility) {
          setVisibility(nextVisibility);
        }
        if (selectedTagIds.length > 0) {
          setSelectedTagIds([]);
        }
      },
      visibility,
    }),
    [selectedTagIds.length, visibility],
  );

  return {
    collectionView,
    navigationView,
    selectedTagIds,
    setSelectedTagIds,
    setVisibility,
    addTagFilter,
    removeTagFilter,
    visibility,
  };
}
