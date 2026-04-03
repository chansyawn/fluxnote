import { RouterProvider, createRouter } from "@tanstack/react-router";

import { DirectionStateProvider } from "@/app/direction";
import { I18nStateProvider } from "@/app/i18n";
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
        <DirectionStateProvider>
          <RouterProvider router={router} />
        </DirectionStateProvider>
      </I18nStateProvider>
    </ThemeStateProvider>
  );
}
