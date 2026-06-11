import { ButtonGroup } from "@fluxnotes/ui/components/button-group";
import { CheckIcon, CopyIcon, XIcon } from "@fluxnotes/ui/icons/lucide";
import { Trans } from "@lingui/react/macro";
import type { ShortcutPreferences } from "@renderer/features/shortcut/shortcut-utils";
import type { ExternalEditSubmission } from "@shared/features/external-edit/models";
import type { ComponentProps } from "react";

import { AdornmentBar } from "./adornment-bar";
import { IconAction } from "./icon-action";

interface ExternalEditControlsProps extends Pick<ComponentProps<"div">, "className"> {
  submission?: ExternalEditSubmission;
  shortcuts?: Partial<
    Pick<ShortcutPreferences, "workspace.submitExternalEdit" | "workspace.cancelExternalEdit">
  >;
  pending?: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ExternalEditControls({
  className,
  submission = { transport: "direct" },
  shortcuts,
  pending,
  onSubmit,
  onCancel,
}: ExternalEditControlsProps) {
  const submitsThroughClipboard = submission.transport === "clipboard";

  return (
    <AdornmentBar className={className} disabled={pending}>
      <ButtonGroup>
        <IconAction
          icon={
            submitsThroughClipboard ? (
              <CopyIcon className="size-3" />
            ) : (
              <CheckIcon className="size-3" />
            )
          }
          label={
            submitsThroughClipboard ? (
              <Trans id="workspace.external-edit.copy">Copy external edit</Trans>
            ) : (
              <Trans id="workspace.external-edit.submit">Submit external edit</Trans>
            )
          }
          tooltipLabel={
            submitsThroughClipboard ? (
              <Trans id="workspace.external-edit.copy.tooltip">Copy</Trans>
            ) : (
              <Trans id="workspace.external-edit.submit.tooltip">Submit</Trans>
            )
          }
          shortcut={shortcuts?.["workspace.submitExternalEdit"]}
          pending={pending}
          onClick={onSubmit}
        />
        <IconAction
          icon={<XIcon className="size-3" />}
          label={<Trans id="workspace.external-edit.cancel">Cancel external edit</Trans>}
          tooltipLabel={<Trans id="workspace.external-edit.cancel.tooltip">Cancel</Trans>}
          shortcut={shortcuts?.["workspace.cancelExternalEdit"]}
          disabled={pending}
          onClick={onCancel}
        />
      </ButtonGroup>
    </AdornmentBar>
  );
}
