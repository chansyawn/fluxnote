import { invokeCommand, subscribeEvent } from "@renderer/app/invoke";
import type { DeepLinkOpenBlockPayload, DeepLinkPending } from "@shared/ipc/contracts";

export async function readPendingDeepLink(): Promise<DeepLinkPending> {
  return await invokeCommand("deepLinkPendingRead", undefined);
}

export async function acknowledgePendingDeepLink(blockId: string): Promise<void> {
  await invokeCommand("deepLinkPendingAcknowledge", { blockId });
}

export function onDeepLinkOpenBlock(
  handler: (payload: DeepLinkOpenBlockPayload) => void,
): () => void {
  return subscribeEvent("deepLinkOpenBlock", handler);
}

export type { DeepLinkOpenBlockPayload, DeepLinkPending };
