import { createFileRoute } from "@tanstack/react-router";

import { BlockWorkspace } from "@/routes/-features/block-workspace";
import { BlockWorkspaceProvider } from "@/routes/-features/use-block-workspace";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <BlockWorkspaceProvider>
      <BlockWorkspace />
    </BlockWorkspaceProvider>
  );
}
