import { BlockWorkspace } from "@renderer/routes/-features/block-workspace";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <BlockWorkspace />;
}
