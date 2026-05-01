import type { AutoArchiveStateChangedPayload } from "@shared/features/blocks/contract";

import { subscribeEvent } from "./invoke";

export function onAutoArchiveStateChanged(
  handler: (payload: AutoArchiveStateChangedPayload) => void,
): () => void {
  return subscribeEvent("blocks.autoArchiveStateChanged", handler);
}
