import { XIcon } from "@fluxnotes/ui/icons/lucide";
import { cn } from "@fluxnotes/ui/lib/utils";
import { getAppPlatform } from "@renderer/app/platform";
import type { AppPlatform } from "@shared/app/platform";
import type { ReactNode } from "react";

interface WindowCloseButtonProps {
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
  platform?: AppPlatform;
}

export function WindowCloseButton({
  ariaLabel,
  children,
  onClick,
  platform = getAppPlatform(),
}: WindowCloseButtonProps) {
  const isWindows = platform === "win32";

  return (
    <button
      aria-label={ariaLabel}
      className={cn(
        "group flex items-center justify-center transition-all [-webkit-app-region:no-drag]",
        isWindows
          ? "h-8 w-10 text-foreground/80 hover:bg-destructive hover:text-white focus-visible:bg-destructive focus-visible:text-white"
          : "size-3 rounded-full bg-red-500/85 text-red-950 hover:brightness-95 dark:bg-red-400/85 dark:text-red-950",
      )}
      data-platform={platform}
      type="button"
      onClick={onClick}
    >
      <XIcon
        aria-hidden="true"
        className={cn(
          isWindows
            ? "size-4"
            : "size-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
        )}
      />
      <span className="sr-only">{children}</span>
    </button>
  );
}
