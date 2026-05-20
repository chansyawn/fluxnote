import { Trans } from "@lingui/react/macro";
import {
  formatShortcutTokens,
  type ShortcutBinding,
} from "@renderer/features/shortcut/shortcut-utils";
import { Button } from "@renderer/ui/components/button";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@renderer/ui/components/tooltip";
import { CheckIcon, CopyIcon, LoaderCircleIcon } from "lucide-react";
import { type ReactNode } from "react";

import { COPY_FEEDBACK_DURATION_MS } from "./copy-feedback";

export { COPY_FEEDBACK_DURATION_MS };

interface IconActionProps {
  active?: boolean;
  icon: ReactNode;
  label: ReactNode;
  tooltipLabel?: ReactNode;
  shortcut?: ShortcutBinding;
  pending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function IconAction({
  active,
  icon,
  label,
  tooltipLabel,
  shortcut,
  pending,
  disabled,
  onClick,
}: IconActionProps) {
  const shortcutTokens = formatShortcutTokens(shortcut ?? null);
  const tooltipContent = tooltipLabel ?? label;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-pressed={active}
            disabled={disabled || pending}
            size="icon-xs"
            variant="ghost"
            onClick={onClick}
          />
        }
      >
        {pending ? <LoaderCircleIcon className="size-3 animate-spin" /> : icon}
        <span className="sr-only">{label}</span>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-2">
        <span>{tooltipContent}</span>
        {shortcutTokens.length > 0 ? (
          <KbdGroup>
            {shortcutTokens.map((token, index) => (
              <Kbd key={`${token}-${index}`}>{token}</Kbd>
            ))}
          </KbdGroup>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

interface CopyActionProps {
  copied?: boolean;
  disabled?: boolean;
  shortcut?: ShortcutBinding;
  onCopy: () => Promise<void>;
}

export function CopyAction({ copied = false, disabled, shortcut, onCopy }: CopyActionProps) {
  return (
    <IconAction
      icon={copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      label={<Trans id="home-note.block.copy">Copy block</Trans>}
      tooltipLabel={<Trans id="home-note.block.copy.tooltip">Copy</Trans>}
      shortcut={shortcut}
      disabled={disabled}
      onClick={async () => {
        await onCopy();
      }}
    />
  );
}
