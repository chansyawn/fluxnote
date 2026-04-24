import { subscribeEvent } from "@renderer/app/invoke";
import type {
  AutoArchiveStateChangedPayload,
  DeepLinkOpenBlockPayload,
} from "@shared/ipc/contracts";

export function onAutoArchiveStateChanged(
  handler: (payload: AutoArchiveStateChangedPayload) => void,
): () => void {
  return subscribeEvent("autoArchiveStateChanged", handler);
}

export function onDeepLinkOpenBlock(
  handler: (payload: DeepLinkOpenBlockPayload) => void,
): () => void {
  return subscribeEvent("deepLinkOpenBlock", handler);
}
