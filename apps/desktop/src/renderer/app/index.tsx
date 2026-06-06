import { HotkeysProvider } from "@fluxnotes/shared";
import { Toaster } from "@fluxnotes/ui/components/sonner";
import { TooltipProvider } from "@fluxnotes/ui/components/tooltip";
import { DirectionStateProvider } from "@renderer/app/direction";
import { I18nStateProvider } from "@renderer/app/i18n";
import { queryClient } from "@renderer/app/query";
import { ThemeStateProvider, useThemeState } from "@renderer/app/theme";
import { AppUpdateSync } from "@renderer/features/app-update/app-update-query";
import { AutoArchiveSync } from "@renderer/features/auto-archive/auto-archive-sync";
import { AppErrorBoundary, RouterErrorFallback } from "@renderer/features/error-boundary";
import { FontSizeStateProvider } from "@renderer/features/preferences/font-size-state";
import { PreferencesSync } from "@renderer/features/preferences/preferences-query";
import { ShortcutStateProvider } from "@renderer/features/shortcut/shortcut-state";
import { GlobalTelemetryErrorListener, TelemetryProvider } from "@renderer/features/telemetry";
import { routeTree } from "@renderer/route-tree.gen";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router";

const history = createMemoryHistory({
  initialEntries: ["/"],
});

const router = createRouter({
  routeTree,
  history,
  defaultErrorComponent: RouterErrorFallback,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function AppToaster() {
  const { resolvedTheme } = useThemeState();

  return <Toaster theme={resolvedTheme} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TelemetryProvider>
        <ThemeStateProvider>
          <I18nStateProvider>
            <AppErrorBoundary>
              <HotkeysProvider>
                <ShortcutStateProvider>
                  <FontSizeStateProvider>
                    <DirectionStateProvider>
                      <TooltipProvider>
                        <GlobalTelemetryErrorListener />
                        <PreferencesSync />
                        <AppUpdateSync />
                        <AutoArchiveSync />
                        <RouterProvider router={router} />
                        <AppToaster />
                      </TooltipProvider>
                    </DirectionStateProvider>
                  </FontSizeStateProvider>
                </ShortcutStateProvider>
              </HotkeysProvider>
            </AppErrorBoundary>
          </I18nStateProvider>
        </ThemeStateProvider>
      </TelemetryProvider>
    </QueryClientProvider>
  );
}
