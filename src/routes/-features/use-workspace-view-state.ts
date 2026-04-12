import { useState, type Dispatch, type SetStateAction } from "react";

import type { BlockVisibility } from "@/clients";

export interface WorkspaceViewState {
  visibility: BlockVisibility;
  selectedTagIds: string[];
  setVisibility: (visibility: BlockVisibility) => void;
  setSelectedTagIds: Dispatch<SetStateAction<string[]>>;
}

export function useWorkspaceViewState(): WorkspaceViewState {
  const [visibility, setVisibility] = useState<BlockVisibility>("active");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  return {
    visibility,
    selectedTagIds,
    setVisibility,
    setSelectedTagIds,
  };
}
