import { Trans } from "@lingui/react/macro";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { CheckIcon, XIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { AdornmentBar } from "./adornment-bar";
import { IconAction } from "./icon-action";

interface ExternalEditControlsProps extends Pick<ComponentProps<"div">, "className"> {
  shortcuts?: Partial<Pick<ShortcutPreferences, "submitExternalEdit" | "cancelExternalEdit">>;
  pending?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ExternalEditControls({
  className,
  shortcuts,
  pending,
  onSubmit,
  onCancel,
}: ExternalEditControlsProps) {
  return (
    <AdornmentBar className={className} disabled={pending}>
      <ButtonGroup>
        <IconAction
          icon={<CheckIcon className="size-3" />}
          label={<Trans id="home-note.block.external-edit.submit">Submit external edit</Trans>}
          tooltipLabel={<Trans id="home-note.block.external-edit.submit.tooltip">Submit</Trans>}
          shortcut={shortcuts?.["submitExternalEdit"]}
          pending={pending}
          onClick={onSubmit}
        />
        <IconAction
          icon={<XIcon className="size-3" />}
          label={<Trans id="home-note.block.external-edit.cancel">Cancel external edit</Trans>}
          tooltipLabel={<Trans id="home-note.block.external-edit.cancel.tooltip">Cancel</Trans>}
          shortcut={shortcuts?.["cancelExternalEdit"]}
          disabled={pending}
          onClick={onCancel}
        />
      </ButtonGroup>
    </AdornmentBar>
  );
}
