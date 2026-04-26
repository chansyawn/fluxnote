import type { Block, BlockVisibility, ExternalEditSession, Tag } from "@renderer/clients";
import type { NoteBlockEditorHandle } from "@renderer/features/note-block/note-block-editor";
import { createContext, useContext, type ReactNode } from "react";

import type { BlockMutationOperation } from "./use-block-mutations";

export interface BlockListItemActions {
  tags: Tag[];
  visibility: BlockVisibility;
  sessionsByBlockId: Map<string, ExternalEditSession>;
  pendingExternalEditIds: Set<string>;
  registerEditorRef: (blockId: string, handle: NoteBlockEditorHandle | null) => void;
  isBlockLocked: (blockId: string) => boolean;
  isBlockOpPending: (blockId: string, op: BlockMutationOperation) => boolean;
  isTagCreatePending: boolean;
  onArchive: (blockId: string) => void;
  onRestore: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onCreateTag: (name: string) => Promise<Tag>;
  onAssignTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  onCancelExternalEdit: (editId: string) => void;
  onSubmitExternalEdit: (blockId: string, editId: string) => void;
  onFocus: (blockId: string) => void;
}

const BlockListItemActionsContext = createContext<BlockListItemActions | null>(null);

export function BlockListItemActionsProvider({
  value,
  children,
}: {
  value: BlockListItemActions;
  children: ReactNode;
}) {
  return (
    <BlockListItemActionsContext.Provider value={value}>
      {children}
    </BlockListItemActionsContext.Provider>
  );
}

export function useBlockListItemActions(): BlockListItemActions {
  const context = useContext(BlockListItemActionsContext);

  if (!context) {
    throw new Error("useBlockListItemActions must be used within BlockListItemActionsProvider");
  }

  return context;
}
