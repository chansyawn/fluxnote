import { Outlet, createRootRoute } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect } from "react";

import { WindowTitleBar } from "@/routes/-features/window-title-bar";

export const Route = createRootRoute({
  component: RootComponent,
});

const appWindow = getCurrentWindow();

function RootComponent() {
  useEffect(() => {
    let isMounted = true;

    const setupCloseHandler = async () =>
      await appWindow.onCloseRequested(async (event) => {
        event.preventDefault();
        await appWindow.hide();
      });

    const cleanupPromise = setupCloseHandler();

    return () => {
      isMounted = false;
      void cleanupPromise.then((unlisten) => {
        if (isMounted) {
          return;
        }

        unlisten();
      });
    };
  }, []);

  return (
    <div className="bg-background min-h-dvh">
      <WindowTitleBar />
      <main className="mx-auto w-full max-w-5xl px-4 pt-20 pb-6">
        <Outlet />
      </main>
    </div>
  );
}
