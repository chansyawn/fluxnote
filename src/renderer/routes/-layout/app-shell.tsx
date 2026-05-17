import { getAppPlatform } from "@renderer/app/platform";
import { cn } from "@renderer/ui/lib/utils";
import { Outlet } from "@tanstack/react-router";

import { WindowTitleBar } from "./window-title-bar";

export function AppShell() {
  const platform = getAppPlatform();

  return (
    <div
      className={cn(
        "app-window-shell mx-auto flex h-full w-full flex-col overflow-hidden",
        platform === "win32" && "bg-neutral-300 dark:bg-neutral-800",
      )}
    >
      <WindowTitleBar />
      <main
        tabIndex={1}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 focus:outline-none"
      >
        <Outlet />
      </main>
    </div>
  );
}
