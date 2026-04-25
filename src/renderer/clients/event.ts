import { subscribeEvent } from "@renderer/app/invoke";
import type { AutoArchiveStateChangedPayload } from "@shared/ipc/contracts";

export function onAutoArchiveStateChanged(
  handler: (payload: AutoArchiveStateChangedPayload) => void,
): () => void {
  return subscribeEvent("autoArchiveStateChanged", handler);
}
