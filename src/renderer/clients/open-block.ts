import { invokeCommand, subscribeEvent } from "@renderer/app/invoke";
import type { OpenBlockPending, OpenBlockRequestedPayload } from "@shared/features/open-block";

export async function readPendingOpenBlock(): Promise<OpenBlockPending> {
  return await invokeCommand("openBlockPendingRead", undefined);
}

export async function acknowledgePendingOpenBlock(blockId: string): Promise<void> {
  await invokeCommand("openBlockPendingAcknowledge", { blockId });
}

export function onOpenBlockRequested(
  handler: (payload: OpenBlockRequestedPayload) => void,
): () => void {
  return subscribeEvent("openBlockRequested", handler);
}

export type { OpenBlockPending, OpenBlockRequestedPayload };
