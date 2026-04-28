import { BlockWorkspace } from "@renderer/routes/_workspace/-features/block-workspace";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_workspace/")({
  component: WorkspaceIndexRoute,
});

function WorkspaceIndexRoute() {
  return <BlockWorkspace />;
}
