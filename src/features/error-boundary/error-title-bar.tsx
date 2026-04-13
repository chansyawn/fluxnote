import { Trans } from "@lingui/react/macro";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { XIcon } from "lucide-react";

const appWindow = getCurrentWindow();

export function ErrorTitleBar() {
  return (
    <header className="z-20 mb-1 h-8 pt-1 select-none">
      <div
        className="relative z-10 flex h-full items-center gap-2 px-3"
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("[data-window-control]")) {
            return;
          }

          if (event.buttons === 1 && event.detail === 1) void appWindow.startDragging();
        }}
      >
        <div className="flex shrink-0 items-center gap-2">
          <button
            aria-label="Exit app"
            className="group flex size-3 items-center justify-center rounded-full bg-red-500/85 text-red-950 transition-all hover:brightness-95 dark:bg-red-400/85 dark:text-red-950"
            data-window-control
            type="button"
            onClick={() => {
              void appWindow.destroy().catch((destroyError) => {
                console.error("Failed to destroy window, fallback to hide", destroyError);
                return appWindow.hide();
              });
            }}
          >
            <XIcon className="size-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100" />
            <span className="sr-only">
              <Trans id="error.global.exit-app">Exit app</Trans>
            </span>
          </button>
        </div>

        <div className="pointer-events-none flex min-w-0 items-center truncate text-sm font-medium">
          <Trans id="app.title">FluxNote</Trans>
        </div>
      </div>
    </header>
  );
}
