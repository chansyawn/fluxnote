import { BlockWorkspace } from "@renderer/routes/-features/block-workspace";
import { BlockWorkspaceProvider } from "@renderer/routes/-features/use-block-workspace";
import { createFileRoute } from "@tanstack/react-router";

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
