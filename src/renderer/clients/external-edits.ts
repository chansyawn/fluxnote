import { invokeCommand, subscribeEvent } from "@renderer/app/invoke";
import type {
  ExternalEditCancelRequest,
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditSubmitRequest,
} from "@shared/features/external-edit";

import type { Block } from "./blocks";

export type {
  ExternalEditCancelRequest,
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditSubmitRequest,
} from "@shared/features/external-edit";

export const listExternalEditSessions = (): Promise<ExternalEditSession[]> =>
  invokeCommand("externalEditsList", undefined);

export const submitExternalEdit = (req: ExternalEditSubmitRequest): Promise<Block> =>
  invokeCommand("externalEditsSubmit", req);

export const cancelExternalEdit = (req: ExternalEditCancelRequest): Promise<void> =>
  invokeCommand("externalEditsCancel", req);

export function onExternalEditSessionsChanged(
  handler: (payload: ExternalEditSessionsChangedPayload) => void,
): () => void {
  return subscribeEvent("externalEditSessionsChanged", handler);
}
