import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircleIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect } from "react";

import { AppInvokeError } from "@/app/invoke";
import { getInboxNoteId } from "@/clients";
import { inboxNoteIdQueryKey } from "@/features/note-block/note-query-key";
import { Button } from "@/ui/components/button";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const inboxNoteIdQuery = useQuery({
    queryKey: inboxNoteIdQueryKey,
    queryFn: getInboxNoteId,
  });

  useEffect(() => {
    if (!inboxNoteIdQuery.data) {
      return;
    }

    void navigate({
      to: "/notes/$id",
      params: { id: inboxNoteIdQuery.data.noteId },
      replace: true,
    });
  }, [inboxNoteIdQuery.data, navigate]);

  if (inboxNoteIdQuery.isPending || inboxNoteIdQuery.data) {
    return (
      <section className="mx-auto flex min-h-[45dvh] w-full max-w-4xl items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <LoaderCircleIcon className="size-4 animate-spin" />
          <Trans id="note.route.initializing">Opening your inbox note...</Trans>
        </div>
      </section>
    );
  }

  const errorMessage =
    inboxNoteIdQuery.error instanceof AppInvokeError
      ? `${inboxNoteIdQuery.error.type}: ${inboxNoteIdQuery.error.message}`
      : inboxNoteIdQuery.error instanceof Error
        ? inboxNoteIdQuery.error.message
        : "Unknown error";

  return (
    <section className="mx-auto flex min-h-[45dvh] w-full max-w-3xl items-center justify-center">
      <div className="border-border/70 bg-card flex w-full max-w-lg flex-col gap-3 rounded-2xl border p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
          <AlertCircleIcon className="size-4" />
          <Trans id="note.route.init-error.title">Failed to open inbox note</Trans>
        </div>
        <p className="text-muted-foreground text-sm">{errorMessage}</p>
        <div>
          <Button
            variant="outline"
            onClick={() => {
              void inboxNoteIdQuery.refetch();
            }}
          >
            <Trans id="note.route.init-error.retry">Retry</Trans>
          </Button>
        </div>
      </div>
    </section>
  );
}
