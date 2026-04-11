import { Trans } from "@lingui/react/macro";
import { RotateCcwIcon, XIcon } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";

import { useShortcutState } from "@/features/shortcut/shortcut-state";
import {
  DEFAULT_SHORTCUT_PREFERENCES,
  getShortcutFromKeyboardEvent,
  getShortcutDisplayTokens,
  type ShortcutAction,
  type ShortcutUpdateError,
} from "@/features/shortcut/shortcut-utils";
import { Button } from "@/ui/components/button";
import { Kbd, KbdGroup } from "@/ui/components/kbd";
import { cn } from "@/ui/lib/utils";

type ShortcutFieldError = ShortcutUpdateError | "unavailable";

interface ShortcutFieldDefinition {
  action: ShortcutAction;
  title: ReactElement;
}

const SHORTCUT_FIELD_DEFINITIONS: ShortcutFieldDefinition[] = [
  {
    action: "toggle-window",
    title: <Trans id="preferences.shortcuts.toggle-window.label">Toggle window</Trans>,
  },
  {
    action: "create-block",
    title: <Trans id="preferences.shortcuts.create-block.label">Create block</Trans>,
  },
  {
    action: "delete-block",
    title: <Trans id="preferences.shortcuts.delete-block.label">Delete block</Trans>,
  },
];

function ShortcutFieldErrorText({ error }: { error: ShortcutFieldError | null }) {
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

export function ShortcutSettingsSection() {
  const { shortcuts, clearShortcut, globalShortcutError, resetShortcut, updateShortcut } =
    useShortcutState();
  const [recordingAction, setRecordingAction] = useState<ShortcutAction | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ShortcutAction, ShortcutFieldError>>
  >({});

  useEffect(() => {
    if (!recordingAction) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setRecordingAction(null);
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [recordingAction]: undefined,
        }));
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const capturedShortcut = getShortcutFromKeyboardEvent(event);

      if (!capturedShortcut) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [recordingAction]: "invalid",
        }));
        return;
      }

      const result = updateShortcut(recordingAction, capturedShortcut);

      if (!result.ok) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          [recordingAction]: result.error,
        }));
        return;
      }

      setRecordingAction(null);
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [recordingAction]: undefined,
      }));
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [recordingAction, updateShortcut]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">
          <Trans id="preferences.shortcuts.title">Shortcuts</Trans>
        </h2>
        <p className="text-muted-foreground text-xs">
          <Trans id="preferences.shortcuts.description">
            Configure the global shortcut and in-app block shortcuts.
          </Trans>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {SHORTCUT_FIELD_DEFINITIONS.map((field) => {
          const isRecording = recordingAction === field.action;
          const shortcut = shortcuts[field.action];
          const fieldError =
            field.action === "toggle-window" &&
            shortcut !== null &&
            globalShortcutError === shortcut
              ? "unavailable"
              : (fieldErrors[field.action] ?? null);
          const shortcutTokens = getShortcutDisplayTokens(shortcut);
          const shouldShowReset = shortcut !== DEFAULT_SHORTCUT_PREFERENCES[field.action];

          return (
            <div
              key={field.action}
              className="grid grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] items-start gap-4 rounded-lg"
            >
              <div className="min-w-0 pt-2">
                <div className="text-xs font-medium">{field.title}</div>
              </div>

              <div className="min-w-0">
                <div className="group/shortcut relative">
                  <button
                    aria-describedby={fieldError ? `${field.action}-shortcut-error` : undefined}
                    aria-invalid={fieldError ? true : undefined}
                    aria-label={shortcutTokens.join("+") || "Not set"}
                    className={cn(
                      "border-border bg-background text-foreground placeholder:text-muted-foreground hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/30 flex h-9 w-full items-center rounded-md border px-3 pr-18 text-left text-sm outline-none transition-colors focus-visible:ring-2",
                      !shortcut && !isRecording && "text-muted-foreground",
                      isRecording && "border-ring ring-ring/30 ring-2",
                      fieldError &&
                        "border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                    )}
                    type="button"
                    onClick={() => {
                      setRecordingAction((currentAction) =>
                        currentAction === field.action ? null : field.action,
                      );
                      setFieldErrors((currentErrors) => ({
                        ...currentErrors,
                        [field.action]: undefined,
                      }));
                    }}
                  >
                    <span className="min-w-0 truncate">
                      {isRecording ? (
                        <Trans id="preferences.shortcuts.recording">Press keys</Trans>
                      ) : shortcutTokens.length > 0 ? (
                        <KbdGroup className="max-w-full flex-nowrap overflow-hidden">
                          {shortcutTokens.map((token) => (
                            <Kbd key={`${field.action}-${token}`} className="shrink-0">
                              {token}
                            </Kbd>
                          ))}
                        </KbdGroup>
                      ) : (
                        <Trans id="preferences.shortcuts.empty">Not set</Trans>
                      )}
                    </span>
                  </button>

                  {!isRecording ? (
                    <div className="absolute top-1/2 right-1 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/shortcut:opacity-100 group-hover/shortcut:opacity-100">
                      {shouldShowReset ? (
                        <Button
                          aria-label="Reset shortcut"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            resetShortcut(field.action);
                            setRecordingAction(null);
                            setFieldErrors((currentErrors) => ({
                              ...currentErrors,
                              [field.action]: undefined,
                            }));
                          }}
                        >
                          <RotateCcwIcon />
                          <span className="sr-only">
                            <Trans id="preferences.shortcuts.reset">Reset shortcut</Trans>
                          </span>
                        </Button>
                      ) : null}

                      {shortcut ? (
                        <Button
                          aria-label="Clear shortcut"
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => {
                            clearShortcut(field.action);
                            setRecordingAction(null);
                            setFieldErrors((currentErrors) => ({
                              ...currentErrors,
                              [field.action]: undefined,
                            }));
                          }}
                        >
                          <XIcon />
                          <span className="sr-only">
                            <Trans id="preferences.shortcuts.clear">Clear shortcut</Trans>
                          </span>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="mt-1 min-h-4">
                  <div id={`${field.action}-shortcut-error`}>
                    <ShortcutFieldErrorText error={fieldError} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
