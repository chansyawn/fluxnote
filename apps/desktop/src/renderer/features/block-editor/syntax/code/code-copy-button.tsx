import { Button } from "@fluxnotes/ui/components/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@fluxnotes/ui/components/tooltip";
import { CheckIcon, CopyIcon } from "@fluxnotes/ui/icons/lucide";
import { useLingui } from "@lingui/react";
import { useEffect, useState } from "react";

import { useBlockEditorRuntime } from "../../core/runtime-extension";

const COPY_FEEDBACK_DURATION_MS = 2000;

interface CodeCopyButtonProps {
  getCode: () => string;
}

export function CodeCopyButton({ getCode }: CodeCopyButtonProps) {
  const { i18n } = useLingui();
  const runtime = useBlockEditorRuntime();
  const [copied, setCopied] = useState(false);
  const copyLabel = i18n._({
    id: "block-editor.code.copy",
    message: "Copy code",
  });
  const copiedLabel = i18n._({
    id: "block-editor.code.copied",
    message: "Copied",
  });

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    await runtime.clipboard.writeText(getCode());
    setCopied(true);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon-xs"
            type="button"
            variant="ghost"
            onClick={() => {
              void handleCopy();
            }}
          />
        }
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span className="sr-only">{copyLabel}</span>
      </TooltipTrigger>
      <TooltipContent>{copied ? copiedLabel : copyLabel}</TooltipContent>
    </Tooltip>
  );
}
