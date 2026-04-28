import { Trans } from "@lingui/react/macro";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { cn } from "@renderer/ui/lib/utils";

import type { ShortcutInputError, ShortcutRecordingFeedback } from "./shortcut-recording-types";

interface ShortcutRecordingPopoverProps {
  feedback: ShortcutRecordingFeedback;
}

function ShortcutRecordingMessage({ error }: { error: ShortcutInputError | null }) {
  if (error === "duplicate") {
    return (
      <Trans id="preferences.shortcuts.error.duplicate">
        This shortcut is already assigned to another action.
      </Trans>
    );
  }

  if (error === "invalid") {
    return (
      <Trans id="preferences.shortcuts.error.invalid-modifier">
        At least one modifier should be included into a hotkey.
      </Trans>
    );
  }

  if (error === "unavailable") {
    return (
      <Trans id="preferences.shortcuts.error.unavailable">
        This global shortcut is unavailable. Another app may already be using it.
      </Trans>
    );
  }

  return <Trans id="preferences.shortcuts.recording.title">Recording...</Trans>;
}

export function ShortcutRecordingPopover({ feedback }: ShortcutRecordingPopoverProps) {
  const isError = feedback.phase === "error";
  const isSuccess = feedback.phase === "success";

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className="h-6">
        <KbdGroup className="flex-wrap justify-center gap-2">
          {feedback.tokens.map((token, index) => (
            <Kbd
              key={`${token}-${index}`}
              className={cn(
                isError && "bg-destructive/15 text-destructive",
                isSuccess && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
              )}
            >
              {token}
            </Kbd>
          ))}
        </KbdGroup>
      </div>

      <p
        className={cn(
          "font-medium text-foreground",
          isError && "text-destructive",
          isSuccess && "text-foreground",
        )}
      >
        {isSuccess ? (
          <Trans id="preferences.shortcuts.recording.success">Your new hotkey is set!</Trans>
        ) : (
          <ShortcutRecordingMessage error={feedback.error} />
        )}
      </p>
    </div>
  );
}
