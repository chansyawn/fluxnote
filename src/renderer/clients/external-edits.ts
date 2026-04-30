import { createFeatureClient } from "@renderer/app/ipc-client";
import type {
  ExternalEditCancelRequest,
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditSubmitRequest,
} from "@shared/features/external-edit";
import { externalEditApi } from "@shared/features/external-edit";

import type { Block } from "./blocks";

export type {
  ExternalEditCancelRequest,
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditSubmitRequest,
} from "@shared/features/external-edit";

const externalEditClient = createFeatureClient(externalEditApi);

export const listExternalEditSessions = (): Promise<ExternalEditSession[]> =>
  externalEditClient.commands.list(undefined);

export const submitExternalEdit = (req: ExternalEditSubmitRequest): Promise<Block> =>
  externalEditClient.commands.submit(req);

export const cancelExternalEdit = (req: ExternalEditCancelRequest): Promise<void> =>
  externalEditClient.commands.cancel(req);

export function onExternalEditSessionsChanged(
  handler: (payload: ExternalEditSessionsChangedPayload) => void,
): () => void {
  return externalEditClient.events.sessionsChanged.subscribe(handler);
}
