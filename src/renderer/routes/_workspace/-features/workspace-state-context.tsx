import type { Block, BlockVisibility, ExternalEditSession, Tag } from "@renderer/clients";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { BlockMutationOperation } from "./use-block-mutations";

export type WorkspacePendingBlockOps = Record<BlockMutationOperation, Set<string>>;

export interface WorkspaceCommands {
  archiveBlock: (blockId: string) => Promise<void>;
  assignBlockTags: (blockId: string, tagIds: string[]) => Promise<Block>;
  cancelExternalEdit: (editId: string) => Promise<void>;
  createBlockWithFocus: () => Promise<void>;
  createTag: (name: string) => Promise<Tag>;
  deleteBlock: (blockId: string) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  focusBlock: (blockId: string | null) => void;
  restoreBlock: (blockId: string) => Promise<void>;
  setBlockKeepState: (blockId: string, isKept: boolean) => Promise<Block>;
  submitExternalEdit: (blockId: string, editId: string) => Promise<void>;
}

export interface WorkspaceBlockState {
  externalEditSession: ExternalEditSession | undefined;
  isArchivePending: boolean;
  isDeletePending: boolean;
  isExternalEditPending: boolean;
  isKeepPending: boolean;
  isLocked: boolean;
  isTagCreatePending: boolean;
  visibility: BlockVisibility;
}

export interface WorkspaceViewContextValue {
  isTagCreatePending: boolean;
  tags: Tag[];
  visibility: BlockVisibility;
}

export interface WorkspaceBlockRuntimeContextValue {
  pendingBlockOps: WorkspacePendingBlockOps;
  pendingExternalEditIds: Set<string>;
  sessionsByBlockId: Map<string, ExternalEditSession>;
}

export interface WorkspaceStateContextValue {
  commands: WorkspaceCommands;
  runtime: WorkspaceBlockRuntimeContextValue;
  view: WorkspaceViewContextValue;
}

const WorkspaceCommandsContext = createContext<WorkspaceCommands | null>(null);
const WorkspaceBlockRuntimeContext = createContext<WorkspaceBlockRuntimeContextValue | null>(null);
const WorkspaceViewContext = createContext<WorkspaceViewContextValue | null>(null);

function useRequiredContext<T>(context: T | null, hookName: string): T {
  if (!context) {
    throw new Error(`${hookName} must be used within WorkspaceStateProvider`);
  }
  return context;
}

function useWorkspaceBlockRuntimeContext(): WorkspaceBlockRuntimeContextValue {
  const ctx = useContext(WorkspaceBlockRuntimeContext);
  return useRequiredContext(ctx, "useWorkspaceBlockRuntimeContext");
}

function useWorkspaceViewContext(): WorkspaceViewContextValue {
  const ctx = useContext(WorkspaceViewContext);
  return useRequiredContext(ctx, "useWorkspaceViewContext");
}

function useWorkspaceCommandsContext(): WorkspaceCommands {
  const ctx = useContext(WorkspaceCommandsContext);
  return useRequiredContext(ctx, "useWorkspaceCommandsContext");
}

export function WorkspaceStateProvider({
  value,
  children,
}: {
  value: WorkspaceStateContextValue;
  children: ReactNode;
}) {
  return (
    <WorkspaceCommandsContext.Provider value={value.commands}>
      <WorkspaceViewContext.Provider value={value.view}>
        <WorkspaceBlockRuntimeContext.Provider value={value.runtime}>
          {children}
        </WorkspaceBlockRuntimeContext.Provider>
      </WorkspaceViewContext.Provider>
    </WorkspaceCommandsContext.Provider>
  );
}

export function useWorkspaceCommands(): WorkspaceCommands {
  return useWorkspaceCommandsContext();
}

export function useWorkspaceTags(): Tag[] {
  return useWorkspaceViewContext().tags;
}

export function useWorkspaceBlockState(blockId: string): WorkspaceBlockState {
  const runtime = useWorkspaceBlockRuntimeContext();
  const view = useWorkspaceViewContext();
  return useMemo(() => {
    const externalEditSession = runtime.sessionsByBlockId.get(blockId);
    const isExternalEditPending = externalEditSession
      ? runtime.pendingExternalEditIds.has(externalEditSession.editId)
      : false;
    const isArchivePending =
      runtime.pendingBlockOps[view.visibility === "active" ? "archive" : "restore"].has(blockId);
    const isDeletePending = runtime.pendingBlockOps.delete.has(blockId);
    const isLocked =
      isExternalEditPending ||
      runtime.pendingBlockOps.archive.has(blockId) ||
      runtime.pendingBlockOps.restore.has(blockId) ||
      runtime.pendingBlockOps.delete.has(blockId) ||
      runtime.pendingBlockOps.setKeep.has(blockId) ||
      runtime.pendingBlockOps.setTags.has(blockId);

    return {
      externalEditSession,
      isArchivePending,
      isDeletePending,
      isExternalEditPending,
      isKeepPending: runtime.pendingBlockOps.setKeep.has(blockId),
      isLocked,
      isTagCreatePending: view.isTagCreatePending,
      visibility: view.visibility,
    };
  }, [
    blockId,
    runtime.pendingBlockOps,
    runtime.pendingExternalEditIds,
    runtime.sessionsByBlockId,
    view.isTagCreatePending,
    view.visibility,
  ]);
}
