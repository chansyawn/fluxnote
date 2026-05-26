export type AppQuitReason = "normal" | "app-update-install";

interface AppLifecycleOptions {
  platform?: NodeJS.Platform;
}

export interface AppLifecycle {
  prepareToQuit: (reason?: AppQuitReason) => void;
  shouldQuitWhenAllWindowsClosed: () => boolean;
}

export function createAppLifecycle({
  platform = process.platform,
}: AppLifecycleOptions = {}): AppLifecycle {
  let quitReason: AppQuitReason = "normal";

  function prepareToQuit(reason: AppQuitReason = "normal"): void {
    quitReason = reason;
  }

  function shouldQuitWhenAllWindowsClosed(): boolean {
    return quitReason === "app-update-install" || platform !== "darwin";
  }

  return {
    prepareToQuit,
    shouldQuitWhenAllWindowsClosed,
  };
}
