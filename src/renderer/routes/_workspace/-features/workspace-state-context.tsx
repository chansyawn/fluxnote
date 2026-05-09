import type { Block, BlockVisibility, ExternalEditSession, Tag } from "@renderer/clients";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { BlockMutationOperation } from "./use-block-mutations";

export type WorkspacePendingBlockOps = Record<BlockMutationOperation, Set<string>>;

export interface WorkspaceCommands {
  archiveBlock: (blockId: string) => void;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  cancelExternalEdit: (editId: string) => void;
  createBlockWithFocus: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteBlock: (blockId: string) => void;
  deleteTag: (tagId: string) => Promise<void>;
  focusBlock: (blockId: string | null) => void;
  restoreBlock: (blockId: string) => void;
  submitExternalEdit: (blockId: string, editId: string) => void;
}

export interface WorkspaceBlockState {
  externalEditSession: ExternalEditSession | undefined;
  isArchivePending: boolean;
  isDeletePending: boolean;
  isExternalEditPending: boolean;
  isLocked: boolean;
  isTagCreatePending: boolean;
  visibility: BlockVisibility;
}

interface WorkspaceStateContextValue {
  commands: WorkspaceCommands;
  isTagCreatePending: boolean;
  pendingBlockOps: WorkspacePendingBlockOps;
  pendingExternalEditIds: Set<string>;
  sessionsByBlockId: Map<string, ExternalEditSession>;
  tags: Tag[];
  visibility: BlockVisibility;
}

const WorkspaceStateContext = createContext<WorkspaceStateContextValue | null>(null);

function useWorkspaceStateContext(): WorkspaceStateContextValue {
  const ctx = useContext(WorkspaceStateContext);
  if (!ctx) {
    throw new Error("useWorkspaceStateContext must be used within WorkspaceStateProvider");
  }
  return ctx;
}

export function WorkspaceStateProvider({
  value,
  children,
}: {
  value: WorkspaceStateContextValue;
  children: ReactNode;
}) {
  return <WorkspaceStateContext.Provider value={value}>{children}</WorkspaceStateContext.Provider>;
}

export function useWorkspaceCommands(): WorkspaceCommands {
  return useWorkspaceStateContext().commands;
}

export function useWorkspaceTags(): Tag[] {
  return useWorkspaceStateContext().tags;
}

export function useWorkspaceBlockState(blockId: string): WorkspaceBlockState {
  const ctx = useWorkspaceStateContext();
  return useMemo(() => {
    const externalEditSession = ctx.sessionsByBlockId.get(blockId);
    const isExternalEditPending = externalEditSession
      ? ctx.pendingExternalEditIds.has(externalEditSession.editId)
      : false;
    const isArchivePending =
      ctx.pendingBlockOps[ctx.visibility === "active" ? "archive" : "restore"].has(blockId);
    const isDeletePending = ctx.pendingBlockOps.delete.has(blockId);
    const isLocked =
      isExternalEditPending ||
      ctx.pendingBlockOps.archive.has(blockId) ||
      ctx.pendingBlockOps.restore.has(blockId) ||
      ctx.pendingBlockOps.delete.has(blockId) ||
      ctx.pendingBlockOps.setTags.has(blockId);

    return {
      externalEditSession,
      isArchivePending,
      isDeletePending,
      isExternalEditPending,
      isLocked,
      isTagCreatePending: ctx.isTagCreatePending,
      visibility: ctx.visibility,
    };
  }, [
    blockId,
    ctx.isTagCreatePending,
    ctx.pendingBlockOps,
    ctx.pendingExternalEditIds,
    ctx.sessionsByBlockId,
    ctx.visibility,
  ]);
}
