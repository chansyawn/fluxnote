import { invokeCommand, subscribeEvent } from "@renderer/app/invoke";

export async function destroyWindow(): Promise<void> {
  await invokeCommand("windowDestroy", undefined);
}

export async function hideWindow(): Promise<void> {
  await invokeCommand("windowHide", undefined);
}

export async function toggleMainWindowVisibility(): Promise<void> {
  await invokeCommand("windowToggle", undefined);
}

export function onWindowCloseRequested(handler: () => void): () => void {
  return subscribeEvent("windowCloseRequested", () => {
    handler();
  });
}

export function onWindowFocusChanged(handler: (focused: boolean) => void): () => void {
  return subscribeEvent("windowFocusChanged", handler);
}
