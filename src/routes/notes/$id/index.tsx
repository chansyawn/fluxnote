import { createFileRoute } from "@tanstack/react-router";

import { BlockWorkspace } from "@/routes/-features/block-workspace";

export const Route = createFileRoute("/notes/$id/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BlockWorkspace />;
}
