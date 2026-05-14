import { Trans } from "@lingui/react/macro";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { cn } from "@renderer/ui/lib/utils";
import { CheckIcon, XIcon } from "lucide-react";

import { ACTION_BAR_CLS, ACTION_BAR_DISABLED_CLS } from "./block-actions";
import { IconAction } from "./icon-action";

interface ExternalEditActionsProps {
  pending?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ExternalEditActions({ pending, onSubmit, onCancel }: ExternalEditActionsProps) {
  return (
    <ButtonGroup
      aria-disabled={pending}
      className={cn(ACTION_BAR_CLS, pending && ACTION_BAR_DISABLED_CLS)}
    >
      <IconAction
        icon={<CheckIcon className="size-3" />}
        label={<Trans id="home-note.block.external-edit.submit">Submit external edit</Trans>}
        tooltipLabel={<Trans id="home-note.block.external-edit.submit.tooltip">Submit</Trans>}
        pending={pending}
        onClick={onSubmit}
      />
      <IconAction
        icon={<XIcon className="size-3" />}
        label={<Trans id="home-note.block.external-edit.cancel">Cancel external edit</Trans>}
        tooltipLabel={<Trans id="home-note.block.external-edit.cancel.tooltip">Cancel</Trans>}
        disabled={pending}
        onClick={onCancel}
      />
    </ButtonGroup>
  );
}
