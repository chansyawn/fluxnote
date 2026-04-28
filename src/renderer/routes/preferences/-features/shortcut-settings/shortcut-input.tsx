import { Trans } from "@lingui/react/macro";
import type { ShortcutAction, ShortcutBinding } from "@renderer/app/preferences/preferences-schema";
import { getShortcutDisplayTokens } from "@renderer/features/shortcut/shortcut-utils";
import { Button } from "@renderer/ui/components/button";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@renderer/ui/components/popover";
import { cn } from "@renderer/ui/lib/utils";
import { RotateCcwIcon, XIcon } from "lucide-react";

import { ShortcutRecordingPopover } from "./shortcut-recording-popover";
import type { ShortcutInputError, ShortcutRecordingFeedback } from "./shortcut-recording-types";

interface ShortcutInputProps {
  action: ShortcutAction;
  shortcut: ShortcutBinding;
  feedback: ShortcutRecordingFeedback | null;
  error: ShortcutInputError | null;
  shouldShowReset: boolean;
  onStartRecording: () => void;
  onCancelRecording: () => void;
  onReset: () => void;
  onClear: () => void;
}

export function ShortcutInput({
  action,
  shortcut,
  feedback,
  error,
  shouldShowReset,
  onStartRecording,
  onCancelRecording,
  onReset,
  onClear,
}: ShortcutInputProps) {
  const shortcutTokens = getShortcutDisplayTokens(shortcut);
  const isRecording = feedback !== null;
  const isInvalid = Boolean(error);

  return (
    <Popover
      open={isRecording}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancelRecording();
        }
      }}
    >
      <div className="group/shortcut relative min-w-0">
        <PopoverTrigger
          render={
            <Button
              aria-invalid={isInvalid ? true : undefined}
              aria-label={shortcutTokens.join("+") || "Not set"}
              className={cn(
                "w-full justify-start pe-10 text-xs text-muted-foreground",
                isRecording && "border-ring ring-ring/30 ring-2",
                isInvalid &&
                  "border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              )}
              type="button"
              variant="outline"
              onClick={onStartRecording}
            />
          }
        >
          <span className="flex min-w-16 items-center truncate">
            {shortcutTokens.length > 0 ? (
              <KbdGroup className="max-w-full flex-nowrap overflow-hidden">
                {shortcutTokens.map((token) => (
                  <Kbd key={`${action}-${token}`} className="shrink-0">
                    {token}
                  </Kbd>
                ))}
              </KbdGroup>
            ) : (
              <span className="text-muted-foreground text-xs">
                <Trans id="preferences.shortcuts.empty">Not set</Trans>
              </span>
            )}
          </span>
        </PopoverTrigger>

        <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-focus-within/shortcut:opacity-100 group-hover/shortcut:opacity-100">
          {shouldShowReset ? (
            <Button
              aria-label="Reset shortcut"
              className="w-4"
              size="icon-sm"
              variant="ghost"
              onClick={onReset}
            >
              <RotateCcwIcon className="size-2.75" />
              <span className="sr-only">
                <Trans id="preferences.shortcuts.reset">Reset shortcut</Trans>
              </span>
            </Button>
          ) : null}

          {shortcut ? (
            <Button
              aria-label="Clear shortcut"
              className="w-4"
              size="icon-sm"
              variant="ghost"
              onClick={onClear}
            >
              <XIcon />
              <span className="sr-only">
                <Trans id="preferences.shortcuts.clear">Clear shortcut</Trans>
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <PopoverContent className="w-48" align="center" side="top">
          <ShortcutRecordingPopover feedback={feedback} />
        </PopoverContent>
      ) : null}
    </Popover>
  );
}
