import { subscribeEvent } from "@renderer/ipc-client";
import type { AutoArchiveStateChangedPayload } from "@shared/features/blocks";

export function onAutoArchiveStateChanged(
  handler: (payload: AutoArchiveStateChangedPayload) => void,
): () => void {
  return subscribeEvent("blocks.autoArchiveStateChanged", handler);
}
