import { createFeatureClient } from "@renderer/app/ipc-client";
import {
  openBlockApi,
  type OpenBlockPending,
  type OpenBlockRequestedPayload,
} from "@shared/features/open-block";

const openBlockClient = createFeatureClient(openBlockApi);

export async function readPendingOpenBlock(): Promise<OpenBlockPending> {
  return await openBlockClient.commands.readPending(undefined);
}

export async function acknowledgePendingOpenBlock(blockId: string): Promise<void> {
  await openBlockClient.commands.acknowledgePending({ blockId });
}

export function onOpenBlockRequested(
  handler: (payload: OpenBlockRequestedPayload) => void,
): () => void {
  return openBlockClient.events.requested.subscribe(handler);
}

export type { OpenBlockPending, OpenBlockRequestedPayload };
