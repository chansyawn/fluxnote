import { Trans } from "@lingui/react/macro";
import { Button } from "@renderer/ui/components/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useState } from "react";

const COPY_FEEDBACK_DURATION_MS = 2000;

interface BlockCopyActionProps {
  isDisabled: boolean;
  onCopy: () => void;
}

export function BlockCopyAction({ isDisabled, onCopy }: BlockCopyActionProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleClick = () => {
    onCopy();
    setCopied(true);
  };

  return (
    <Button disabled={isDisabled} size="icon-xs" variant="ghost" onClick={handleClick}>
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
      <span className="sr-only">
        <Trans id="home-note.block.copy">Copy block</Trans>
      </span>
    </Button>
  );
}
