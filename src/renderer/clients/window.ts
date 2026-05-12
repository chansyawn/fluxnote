import { invokeCommand, subscribeEvent } from "./ipc/invoke";

export async function destroyWindow(): Promise<void> {
  await invokeCommand("window.destroy", undefined);
}

export async function hideWindow(): Promise<void> {
  await invokeCommand("window.hide", undefined);
}

export async function toggleMainWindowVisibility(): Promise<void> {
  await invokeCommand("window.toggle", undefined);
}

export async function captureBlockAndShowWindow(): Promise<{ blockId: string }> {
  return await invokeCommand("window.capture-block", undefined);
}

export function onWindowCloseRequested(handler: () => void): () => void {
  return subscribeEvent("window.close-requested", () => {
    handler();
  });
}

export function onWindowFocusChanged(handler: (focused: boolean) => void): () => void {
  return subscribeEvent("window.focus-changed", handler);
}
