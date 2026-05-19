import { Trans } from "@lingui/react/macro";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { cn } from "@renderer/ui/lib/utils";
import type { ExternalEditTrigger } from "@shared/features/external-edit/session-contracts";
import { CheckIcon, XIcon } from "lucide-react";

import { ACTION_BAR_CLS, ACTION_BAR_DISABLED_CLS } from "../block-actions/block-actions";
import { IconAction } from "../block-actions/icon-action";
import { ExternalEditMetadataCard } from "./external-edit-metadata-card";

interface ExternalEditActionsProps {
  shortcuts?: Partial<Pick<ShortcutPreferences, "submit-external-edit" | "cancel-external-edit">>;
  pending?: boolean;
  trigger?: ExternalEditTrigger;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ExternalEditActions({
  shortcuts,
  pending,
  trigger,
  onSubmit,
  onCancel,
}: ExternalEditActionsProps) {
  return (
    <div className="flex w-fit max-w-full items-center gap-1.5">
      <ButtonGroup
        aria-disabled={pending}
        className={cn(ACTION_BAR_CLS, pending && ACTION_BAR_DISABLED_CLS)}
      >
        <IconAction
          icon={<CheckIcon className="size-3" />}
          label={<Trans id="home-note.block.external-edit.submit">Submit external edit</Trans>}
          tooltipLabel={<Trans id="home-note.block.external-edit.submit.tooltip">Submit</Trans>}
          shortcut={shortcuts?.["submit-external-edit"]}
          pending={pending}
          onClick={onSubmit}
        />
        <IconAction
          icon={<XIcon className="size-3" />}
          label={<Trans id="home-note.block.external-edit.cancel">Cancel external edit</Trans>}
          tooltipLabel={<Trans id="home-note.block.external-edit.cancel.tooltip">Cancel</Trans>}
          shortcut={shortcuts?.["cancel-external-edit"]}
          disabled={pending}
          onClick={onCancel}
        />
      </ButtonGroup>
      {trigger ? <ExternalEditMetadataCard trigger={trigger} /> : null}
    </div>
  );
}
