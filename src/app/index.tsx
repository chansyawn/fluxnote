import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { DirectionStateProvider } from "@/app/direction";
import { I18nStateProvider } from "@/app/i18n";
import { queryClient } from "@/app/query";
import { ThemeStateProvider } from "@/app/theme";
import { routeTree } from "@/route-tree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ThemeStateProvider>
      <I18nStateProvider>
        <QueryClientProvider client={queryClient}>
          <DirectionStateProvider>
            <RouterProvider router={router} />
          </DirectionStateProvider>
        </QueryClientProvider>
      </I18nStateProvider>
    </ThemeStateProvider>
  );
}
