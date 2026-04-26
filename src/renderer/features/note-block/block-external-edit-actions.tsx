import { Trans } from "@lingui/react/macro";
import { Button } from "@renderer/ui/components/button";
import { CheckIcon, LoaderCircleIcon, XIcon } from "lucide-react";

import { BlockActionBar } from "./block-action-bar";

interface BlockExternalEditActionsProps {
  isPending: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}

export function BlockExternalEditActions({
  isPending,
  onCancel,
  onSubmit,
}: BlockExternalEditActionsProps) {
  return (
    <BlockActionBar disabled={isPending}>
      <Button disabled={isPending} size="icon-xs" variant="ghost" onClick={onSubmit}>
        {isPending ? (
          <LoaderCircleIcon className="size-3 animate-spin" />
        ) : (
          <CheckIcon className="size-3" />
        )}
        <span className="sr-only">
          <Trans id="home-note.block.external-edit.submit">Submit external edit</Trans>
        </span>
      </Button>
      <Button disabled={isPending} size="icon-xs" variant="ghost" onClick={onCancel}>
        <XIcon className="size-3" />
        <span className="sr-only">
          <Trans id="home-note.block.external-edit.cancel">Cancel external edit</Trans>
        </span>
      </Button>
    </BlockActionBar>
  );
}
