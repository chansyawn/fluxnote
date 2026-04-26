import { ScrollContainerProvider } from "@renderer/app/scroll-container";
import { hideWindow, onWindowCloseRequested } from "@renderer/clients/window";
import { RouterErrorFallback } from "@renderer/features/error-boundary";
import { WindowTitleBar } from "@renderer/routes/-features/window-title-bar";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouterErrorFallback,
});

function RootComponent() {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

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
      <main ref={setScrollContainer} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ScrollContainerProvider element={scrollContainer}>
          <div className="mx-auto w-full max-w-5xl px-3 pb-6">
            <Outlet />
          </div>
        </ScrollContainerProvider>
      </main>
    </div>
  );
}
