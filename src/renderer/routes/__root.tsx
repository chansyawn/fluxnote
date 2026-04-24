import { hideWindow, onWindowCloseRequested } from "@renderer/clients/window";
import { RouterErrorFallback } from "@renderer/features/error-boundary";
import { WindowTitleBar } from "@renderer/routes/-features/window-title-bar";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouterErrorFallback,
});

function RootComponent() {
  useEffect(() => {
    const unlisten = onWindowCloseRequested(() => {
      void hideWindow();
    });
    return () => {
      unlisten();
    };
  }, []);

  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl">
      <WindowTitleBar />
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-5xl px-3 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
