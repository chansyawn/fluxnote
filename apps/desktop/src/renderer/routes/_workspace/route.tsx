import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_workspace")({
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  return <Outlet />;
}
