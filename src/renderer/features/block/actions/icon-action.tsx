import { Trans } from "@lingui/react/macro";
import { Button } from "@renderer/ui/components/button";
import { cn } from "@renderer/ui/lib/utils";
import { CheckIcon, CopyIcon, LoaderCircleIcon, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const COPY_FEEDBACK_DURATION_MS = 2000;

interface IconActionProps {
  icon: LucideIcon;
  label: ReactNode;
  pending?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function IconAction({ icon: Icon, label, pending, disabled, onClick }: IconActionProps) {
  const Glyph = pending ? LoaderCircleIcon : Icon;
  return (
    <Button disabled={disabled || pending} size="icon-xs" variant="ghost" onClick={onClick}>
      <Glyph className={cn("size-3", pending && "animate-spin")} />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

interface CopyActionProps {
  disabled?: boolean;
  onCopy: () => void;
}

export function CopyAction({ disabled, onCopy }: CopyActionProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <IconAction
      icon={copied ? CheckIcon : CopyIcon}
      label={<Trans id="home-note.block.copy">Copy block</Trans>}
      disabled={disabled}
      onClick={() => {
        onCopy();
        setCopied(true);
      }}
    />
  );
}
