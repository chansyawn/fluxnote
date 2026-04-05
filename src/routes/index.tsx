import { createFileRoute } from "@tanstack/react-router";

import { HomeNoteScreen } from "@/features/note/home-note-screen";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HomeNoteScreen />;
}
