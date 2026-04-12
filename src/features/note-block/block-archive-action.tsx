import { Trans } from "@lingui/react/macro";
import { ArchiveIcon, ArchiveRestoreIcon, LoaderCircleIcon } from "lucide-react";

import type { BlockVisibility } from "@/clients";
import { Button } from "@/ui/components/button";

interface BlockArchiveActionProps {
  visibility: BlockVisibility;
  isDisabled: boolean;
  isPending: boolean;
  onClick: () => void;
}

export function BlockArchiveAction({
  visibility,
  isDisabled,
  isPending,
  onClick,
}: BlockArchiveActionProps) {
  return (
    <Button disabled={isDisabled || isPending} size="icon-xs" variant="ghost" onClick={onClick}>
      {isPending ? (
        <LoaderCircleIcon className="size-3 animate-spin" />
      ) : visibility === "active" ? (
        <ArchiveIcon className="size-3" />
      ) : (
        <ArchiveRestoreIcon className="size-3" />
      )}
      <span className="sr-only">
        {visibility === "active" ? (
          <Trans id="workspace.blocks.archive">Archive block</Trans>
        ) : (
          <Trans id="workspace.blocks.restore">Restore block</Trans>
        )}
      </span>
    </Button>
  );
}
