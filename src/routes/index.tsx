import { createFileRoute } from "@tanstack/react-router";

import { BlockWorkspace } from "@/routes/-features/block-workspace";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BlockWorkspace />;
}
