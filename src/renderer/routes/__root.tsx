import { RootRouterErrorFallback } from "@renderer/features/error-boundary";
import {
  OpenBlockRequestProvider,
  OpenBlockWorkspaceRouteSync,
} from "@renderer/features/open-block/open-block-request-context";
import { useBindWindowCloseRequest } from "@renderer/routes/-layout/use-bind-window-close-request";
import { WindowShell } from "@renderer/routes/-layout/window-shell";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { WindowTitleBar } from "./-layout/window-title-bar";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootRouterErrorFallback,
});

function RootComponent() {
  useBindWindowCloseRequest();

  return (
    <OpenBlockRequestProvider>
      <OpenBlockWorkspaceRouteSync />
      <WindowShell>
        <WindowTitleBar />
        <main
          tabIndex={1}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 focus:outline-none"
        >
          <Outlet />
        </main>
      </WindowShell>
    </OpenBlockRequestProvider>
  );
}
