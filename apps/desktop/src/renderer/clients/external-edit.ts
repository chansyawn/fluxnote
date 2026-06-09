import type { Block } from "@shared/features/blocks/models";
import {
  externalEditContract,
  type ExternalEditSessionsChangedPayload,
  type ExternalEditWriteBackFailedPayload,
} from "@shared/features/external-edit/contract";
import { type ExternalEditSession } from "@shared/features/external-edit/session-contracts";
import type { z } from "zod";

import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export type ExternalEditCancelRequest = z.input<
  (typeof externalEditContract)["commands"]["external-edit.cancel"]["input"]
>;
export type ExternalEditSubmitRequest = z.input<
  (typeof externalEditContract)["commands"]["external-edit.submit"]["input"]
>;
export type {
  ExternalEditSession,
  ExternalEditSessionsChangedPayload,
  ExternalEditWriteBackFailedPayload,
};

export const listExternalEditSessions = (): Promise<ExternalEditSession[]> =>
  invokeCommand("external-edit.list", undefined);

export const submitExternalEdit = (req: ExternalEditSubmitRequest): Promise<Block> =>
  invokeCommand("external-edit.submit", req);

export const cancelExternalEdit = (req: ExternalEditCancelRequest): Promise<void> =>
  invokeCommand("external-edit.cancel", req);

export const startFocusedExternalEdit = (): Promise<ExternalEditSession> =>
  invokeCommand("external-edit.start-focused", undefined);

export function onExternalEditSessionsChanged(
  handler: (payload: ExternalEditSessionsChangedPayload) => void,
): () => void {
  return subscribeEvent("external-edit.sessions-changed", handler);
}

export function onExternalEditWriteBackFailed(
  handler: (payload: ExternalEditWriteBackFailedPayload) => void,
): () => void {
  return subscribeEvent("external-edit.write-back-failed", handler);
}
