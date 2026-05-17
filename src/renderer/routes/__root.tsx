import { RouterErrorFallback } from "@renderer/features/error-boundary";
import {
  OpenBlockRequestProvider,
  OpenBlockWorkspaceRouteSync,
} from "@renderer/features/open-block/open-block-request-context";
import { AppShell } from "@renderer/routes/-layout/app-shell";
import { useBindWindowCloseRequest } from "@renderer/routes/-layout/use-bind-window-close-request";
import { createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouterErrorFallback,
});

function RootComponent() {
  useBindWindowCloseRequest();

  return (
    <OpenBlockRequestProvider>
      <OpenBlockWorkspaceRouteSync />
      <AppShell />
    </OpenBlockRequestProvider>
  );
}
