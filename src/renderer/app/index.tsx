import { DirectionStateProvider } from "@renderer/app/direction";
import { I18nStateProvider } from "@renderer/app/i18n";
import { queryClient } from "@renderer/app/query";
import { ThemeStateProvider } from "@renderer/app/theme";
import { AutoArchiveSync } from "@renderer/features/auto-archive/auto-archive-sync";
import { AppErrorBoundary, RouterErrorFallback } from "@renderer/features/error-boundary";
import { ShortcutStateProvider } from "@renderer/features/shortcut/shortcut-state";
import { routeTree } from "@renderer/route-tree.gen";
import { Toaster } from "@renderer/ui/components/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

const router = createRouter({
  routeTree,
  defaultErrorComponent: RouterErrorFallback,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ThemeStateProvider>
      <I18nStateProvider>
        <AppErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ShortcutStateProvider>
              <DirectionStateProvider>
                <AutoArchiveSync />
                <RouterProvider router={router} />
                <Toaster />
              </DirectionStateProvider>
            </ShortcutStateProvider>
          </QueryClientProvider>
        </AppErrorBoundary>
      </I18nStateProvider>
    </ThemeStateProvider>
  );
}
