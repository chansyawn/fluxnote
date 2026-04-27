import { subscribeEvent } from "@renderer/app/invoke";
import type { AutoArchiveStateChangedPayload } from "@shared/features/blocks";

export function onAutoArchiveStateChanged(
  handler: (payload: AutoArchiveStateChangedPayload) => void,
): () => void {
  return subscribeEvent("autoArchiveStateChanged", handler);
}
