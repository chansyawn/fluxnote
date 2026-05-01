import { invokeCommand, subscribeEvent } from "@renderer/ipc-client";
import type { Block } from "@shared/features/blocks";
import type {
  ExternalEditCancelRequest,
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditSubmitRequest,
} from "@shared/features/external-edit";

export type {
  ExternalEditCancelRequest,
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditSubmitRequest,
} from "@shared/features/external-edit";

export const listExternalEditSessions = (): Promise<ExternalEditSession[]> =>
  invokeCommand("externalEdit.list", undefined);

export const submitExternalEdit = (req: ExternalEditSubmitRequest): Promise<Block> =>
  invokeCommand("externalEdit.submit", req);

export const cancelExternalEdit = (req: ExternalEditCancelRequest): Promise<void> =>
  invokeCommand("externalEdit.cancel", req);

export function onExternalEditSessionsChanged(
  handler: (payload: ExternalEditSessionsChangedPayload) => void,
): () => void {
  return subscribeEvent("externalEdit.sessionsChanged", handler);
}
