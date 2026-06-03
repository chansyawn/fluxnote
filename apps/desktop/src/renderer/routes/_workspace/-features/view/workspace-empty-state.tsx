import { Button } from "@fluxnotes/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@fluxnotes/ui/components/empty";
import { Trans } from "@lingui/react/macro";
import { LoaderCircleIcon, PlusIcon } from "lucide-react";
import type { ReactElement } from "react";

export function LoadingState(): ReactElement {
  return (
    <section className="mx-auto flex min-h-[45dvh] w-full items-center justify-center">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircleIcon className="size-4 animate-spin" />
        <Trans id="workspace.loading">Loading your blocks...</Trans>
      </div>
    </section>
  );
}

export function WorkspaceEmptyState({
  onCreateBlock,
  isCreatingBlock,
}: {
  onCreateBlock: () => Promise<void>;
  isCreatingBlock: boolean;
}) {
  return (
    <Empty className="bg-card border border-dashed">
      <EmptyHeader>
        <EmptyTitle>
          <Trans id="workspace.empty.title">No blocks yet</Trans>
        </EmptyTitle>
        <EmptyDescription>
          <Trans id="workspace.empty.description">Start with an empty block.</Trans>
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          disabled={isCreatingBlock}
          onClick={() => {
            void onCreateBlock();
          }}
        >
          {isCreatingBlock ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
          <Trans id="workspace.empty.action">Create first block</Trans>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function WorkspaceArchivedEmptyState() {
  return (
    <Empty className="bg-card border border-dashed">
      <EmptyHeader>
        <EmptyTitle>
          <Trans id="workspace.archived.empty.title">No archived blocks</Trans>
        </EmptyTitle>
        <EmptyDescription>
          <Trans id="workspace.archived.empty.description">
            Archived blocks will appear here until you restore them.
          </Trans>
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function WorkspaceFilteredEmptyState({ visibility }: { visibility: "active" | "archived" }) {
  return (
    <Empty className="bg-card border border-dashed">
      <EmptyHeader>
        <EmptyTitle>
          {visibility === "active" ? (
            <Trans id="workspace.filtered.empty.title">No blocks match the selected tags</Trans>
          ) : (
            <Trans id="workspace.archived.filtered.empty.title">
              No archived blocks match the selected tags
            </Trans>
          )}
        </EmptyTitle>
        <EmptyDescription>
          {visibility === "active" ? (
            <Trans id="workspace.filtered.empty.description">
              Clear one of the filters or create a new block outside the current tag selection.
            </Trans>
          ) : (
            <Trans id="workspace.archived.filtered.empty.description">
              Clear one of the filters or switch back to active blocks.
            </Trans>
          )}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
