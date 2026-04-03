import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { RouterProvider, createRouter } from "@tanstack/react-router";

import { messages } from "@/locales/en/messages.po";

// Import the generated route tree
import { routeTree } from "./route-tree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

i18n.load("en", messages);
i18n.activate("en");

export function App() {
  return (
    <I18nProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nProvider>
  );
}
