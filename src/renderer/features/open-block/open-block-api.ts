import { invokeCommand, subscribeEvent } from "@renderer/ipc-client";
import type { OpenBlockPending, OpenBlockRequestedPayload } from "@shared/features/open-block";

export async function readPendingOpenBlock(): Promise<OpenBlockPending> {
  return await invokeCommand("openBlock.readPending", undefined);
}

export async function acknowledgePendingOpenBlock(blockId: string): Promise<void> {
  await invokeCommand("openBlock.acknowledgePending", { blockId });
}

export function onOpenBlockRequested(
  handler: (payload: OpenBlockRequestedPayload) => void,
): () => void {
  return subscribeEvent("openBlock.requested", handler);
}

export type { OpenBlockPending, OpenBlockRequestedPayload };
