import { createFeatureClient } from "@renderer/app/ipc-client";
import { windowApi } from "@shared/features/window";

const windowClient = createFeatureClient(windowApi);

export async function destroyWindow(): Promise<void> {
  await windowClient.commands.destroy(undefined);
}

export async function hideWindow(): Promise<void> {
  await windowClient.commands.hide(undefined);
}

export async function toggleMainWindowVisibility(): Promise<void> {
  await windowClient.commands.toggle(undefined);
}

export function onWindowCloseRequested(handler: () => void): () => void {
  return windowClient.events.closeRequested.subscribe(() => {
    handler();
  });
}

export function onWindowFocusChanged(handler: (focused: boolean) => void): () => void {
  return windowClient.events.focusChanged.subscribe(handler);
}
