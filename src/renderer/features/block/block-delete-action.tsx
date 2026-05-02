import { Trans } from "@lingui/react/macro";
import { Button } from "@renderer/ui/components/button";
import { LoaderCircleIcon, Trash2Icon } from "lucide-react";

interface BlockDeleteActionProps {
  isDeleting: boolean;
  isDisabled: boolean;
  onClick: () => void;
}

export function BlockDeleteAction({ isDeleting, isDisabled, onClick }: BlockDeleteActionProps) {
  return (
    <Button disabled={isDisabled || isDeleting} size="icon-xs" variant="ghost" onClick={onClick}>
      {isDeleting ? (
        <LoaderCircleIcon className="size-3 animate-spin" />
      ) : (
        <Trash2Icon className="size-3" />
      )}
      <span className="sr-only">
        <Trans id="home-note.block.delete">Delete block</Trans>
      </span>
    </Button>
  );
}
