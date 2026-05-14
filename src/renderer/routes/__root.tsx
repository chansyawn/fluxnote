import { RouterErrorFallback } from "@renderer/features/error-boundary";
import {
  OpenBlockRequestProvider,
  OpenBlockWorkspaceRouteSync,
} from "@renderer/features/open-block/open-block-request-context";
import { useBindWindowCloseRequest } from "@renderer/routes/-layout/use-bind-window-close-request";
import { WindowTitleBar } from "@renderer/routes/-layout/window-title-bar";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouterErrorFallback,
});

function RootComponent() {
  useBindWindowCloseRequest();

  return (
    <OpenBlockRequestProvider>
      <OpenBlockWorkspaceRouteSync />
      <div className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl">
        <WindowTitleBar />
        <main
          tabIndex={1}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </OpenBlockRequestProvider>
  );
}
