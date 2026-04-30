import { createFeatureClient } from "@renderer/app/ipc-client";
import { blocksApi, type AutoArchiveStateChangedPayload } from "@shared/features/blocks";

const blocksClient = createFeatureClient(blocksApi);

export function onAutoArchiveStateChanged(
  handler: (payload: AutoArchiveStateChangedPayload) => void,
): () => void {
  return blocksClient.events.autoArchiveStateChanged.subscribe(handler);
}
