import type { BlockVisibility, ExternalEditSession, Tag } from "@renderer/clients";
import { useMemo } from "react";

import type {
  WorkspaceBlockRuntimeContextValue,
  WorkspaceCommands,
  WorkspacePendingBlockOps,
  WorkspaceStateContextValue,
  WorkspaceViewContextValue,
} from "./workspace-state-context";

interface UseWorkspaceContextValueParams {
  commands: WorkspaceCommands;
  isTagCreatePending: boolean;
  pendingBlockOps: WorkspacePendingBlockOps;
  pendingExternalEditIds: Set<string>;
  sessionsByBlockId: Map<string, ExternalEditSession>;
  tags: Tag[];
  visibility: BlockVisibility;
}

export function useWorkspaceContextValue({
  commands,
  isTagCreatePending,
  pendingBlockOps,
  pendingExternalEditIds,
  sessionsByBlockId,
  tags,
  visibility,
}: UseWorkspaceContextValueParams): WorkspaceStateContextValue {
  const view = useMemo<WorkspaceViewContextValue>(
    () => ({
      isTagCreatePending,
      tags,
      visibility,
    }),
    [isTagCreatePending, tags, visibility],
  );

  const runtime = useMemo<WorkspaceBlockRuntimeContextValue>(
    () => ({
      pendingBlockOps,
      pendingExternalEditIds,
      sessionsByBlockId,
    }),
    [pendingBlockOps, pendingExternalEditIds, sessionsByBlockId],
  );

  return useMemo(
    () => ({
      commands,
      runtime,
      view,
    }),
    [commands, runtime, view],
  );
}
