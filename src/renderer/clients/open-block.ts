import {
  openBlockContract,
  type OpenBlockRequestedPayload,
} from "@shared/features/open-block/contract";
import { openBlockPendingSchema } from "@shared/features/open-block/models";
import type { z } from "zod";

import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export type OpenBlockPending = z.infer<typeof openBlockPendingSchema>;
export type OpenBlockPendingAcknowledgeRequest = z.input<
  (typeof openBlockContract)["commands"]["openBlock.acknowledgePending"]["input"]
>;

export async function readPendingOpenBlock(): Promise<OpenBlockPending> {
  return await invokeCommand("openBlock.readPending", undefined);
}

export async function acknowledgePendingOpenBlock(blockId: string): Promise<void> {
  const input: OpenBlockPendingAcknowledgeRequest = { blockId };
  await invokeCommand("openBlock.acknowledgePending", input);
}

export function onOpenBlockRequested(
  handler: (payload: OpenBlockRequestedPayload) => void,
): () => void {
  return subscribeEvent("openBlock.requested", handler);
}

export type { OpenBlockRequestedPayload };
