import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/ui/components/button";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Button>Hello FluxNote</Button>
    </div>
  );
}
