import { RouterErrorFallback } from "@renderer/features/error-boundary";
import { useBindWindowCloseRequest } from "@renderer/routes/-layout/use-bind-window-close-request";
import { WindowTitleBar } from "@renderer/routes/-layout/window-title-bar";
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouterErrorFallback,
});

function RootComponent() {
  useBindWindowCloseRequest();

  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden rounded-xl">
      <WindowTitleBar />
      <main className="me-1 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-5xl px-3 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
