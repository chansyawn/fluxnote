import { cn } from "@fluxnotes/ui/lib/utils";
import { getAppPlatform } from "@renderer/app/platform";

export function WindowShell({ children }: { children: React.ReactNode }) {
  const platform = getAppPlatform();

  return (
    <div
      className={cn(
        "app-window-shell mx-auto flex h-full w-full flex-col overflow-hidden",
        platform === "win32" && "bg-neutral-300 dark:bg-neutral-900",
      )}
    >
      {children}
    </div>
  );
}
