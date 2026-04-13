import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { DirectionStateProvider } from "@/app/direction";
import { I18nStateProvider } from "@/app/i18n";
import { queryClient } from "@/app/query";
import { ThemeStateProvider } from "@/app/theme";
import { AppErrorBoundary, RouterErrorFallback } from "@/features/error-boundary";
import { ShortcutStateProvider } from "@/features/shortcut/shortcut-state";
import { routeTree } from "@/route-tree.gen";
import { Toaster } from "@/ui/components/sonner";

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
