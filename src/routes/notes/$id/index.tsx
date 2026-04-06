import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import { getInboxNoteId } from "@/clients";
import { NotePage } from "@/routes/notes/$id/-features/note-page";

export const Route = createFileRoute("/notes/$id/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const handleMissingNote = useCallback(async () => {
    const inbox = await getInboxNoteId();

    await navigate({
      to: "/notes/$id",
      params: { id: inbox.noteId },
      replace: true,
    });
  }, [navigate]);

  return <NotePage noteId={id} onMissingNote={handleMissingNote} />;
}
