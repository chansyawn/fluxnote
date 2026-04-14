import { Trans } from "@lingui/react/macro";
import { RotateCcwIcon, XIcon } from "lucide-react";

import type { ShortcutBinding } from "@/app/preferences/preferences-schema";
import { getShortcutDisplayTokens } from "@/features/shortcut/shortcut-utils";
import { Button } from "@/ui/components/button";
import { Kbd, KbdGroup } from "@/ui/components/kbd";
import { cn } from "@/ui/lib/utils";

export type ShortcutInputError = "duplicate" | "invalid" | "unavailable";

interface ShortcutInputProps {
  action: string;
  shortcut: ShortcutBinding;
  isRecording: boolean;
  recordingPreviewTokens: string[];
  error: ShortcutInputError | null;
  shouldShowReset: boolean;
  onToggleRecording: () => void;
  onReset: () => void;
  onClear: () => void;
}

function ShortcutFieldErrorText({ error }: { error: ShortcutInputError | null }) {
  if (error === "duplicate") {
    return (
      <p className="text-destructive text-xs">
        <Trans id="preferences.shortcuts.error.duplicate">
          This shortcut is already assigned to another action.
        </Trans>
      </p>
    );
  }

  if (error === "invalid") {
    return (
      <p className="text-destructive text-xs">
        <Trans id="preferences.shortcuts.error.invalid">
          Use at least one modifier key with a supported key.
        </Trans>
      </p>
    );
  }

  if (error === "unavailable") {
    return (
      <p className="text-destructive text-xs">
        <Trans id="preferences.shortcuts.error.unavailable">
          This global shortcut is unavailable. Another app may already be using it.
        </Trans>
      </p>
    );
  }

  return null;
}

export function ShortcutInput({
  action,
  shortcut,
  isRecording,
  recordingPreviewTokens,
  error,
  shouldShowReset,
  onToggleRecording,
  onReset,
  onClear,
}: ShortcutInputProps) {
  const shortcutTokens = getShortcutDisplayTokens(shortcut);
  const recordingHintId = `${action}-shortcut-recording-hint`;

  return (
    <div className="min-w-0">
      <div className="group/shortcut relative">
        <button
          aria-describedby={
            isRecording ? recordingHintId : error ? `${action}-shortcut-error` : undefined
          }
          aria-invalid={error ? true : undefined}
          aria-label={shortcutTokens.join("+") || "Not set"}
          className={cn(
            "border-border bg-input/20 text-foreground placeholder:text-muted-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/30 flex h-7 w-full items-center rounded-md border px-2 pr-18 text-left text-xs/relaxed outline-none transition-colors focus-visible:ring-2",
            !shortcut && !isRecording && "text-muted-foreground",
            isRecording && "pr-24",
            isRecording && "border-ring ring-ring/30 ring-2",
            error &&
              "border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
          )}
          type="button"
          onClick={onToggleRecording}
        >
          <span className="flex min-w-0 items-center truncate">
            {isRecording && recordingPreviewTokens.length > 0 ? (
              <KbdGroup className="max-w-full flex-nowrap overflow-hidden">
                {recordingPreviewTokens.map((token) => (
                  <Kbd key={`${action}-recording-${token}`} className="shrink-0">
                    {token}
                  </Kbd>
                ))}
              </KbdGroup>
            ) : isRecording ? (
              <span className="text-muted-foreground text-xs">
                <Trans id="preferences.shortcuts.recording">Press keys</Trans>
              </span>
            ) : shortcutTokens.length > 0 ? (
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
        </button>

        {isRecording ? (
          <div
            id={recordingHintId}
            className="text-muted-foreground absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1 text-xs"
          >
            <Kbd className="h-5 px-1.5 text-[10px]">Esc</Kbd>
            <span>
              <Trans id="preferences.shortcuts.recording.exit">to exit</Trans>
            </span>
          </div>
        ) : (
          <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/shortcut:opacity-100 group-hover/shortcut:opacity-100">
            {shouldShowReset ? (
              <Button aria-label="Reset shortcut" size="icon-sm" variant="ghost" onClick={onReset}>
                <RotateCcwIcon />
                <span className="sr-only">
                  <Trans id="preferences.shortcuts.reset">Reset shortcut</Trans>
                </span>
              </Button>
            ) : null}

            {shortcut ? (
              <Button aria-label="Clear shortcut" size="icon-sm" variant="ghost" onClick={onClear}>
                <XIcon />
                <span className="sr-only">
                  <Trans id="preferences.shortcuts.clear">Clear shortcut</Trans>
                </span>
              </Button>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-1 min-h-4">
        <div id={`${action}-shortcut-error`}>
          <ShortcutFieldErrorText error={error} />
        </div>
      </div>
    </div>
  );
}
