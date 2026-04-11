import { Trans } from "@lingui/react/macro";
import { type ReactElement } from "react";

import { ShortcutInput } from "@/features/shortcut/shortcut-input";
import { useShortcutState } from "@/features/shortcut/shortcut-state";
import {
  DEFAULT_SHORTCUT_PREFERENCES,
  type ShortcutAction,
} from "@/features/shortcut/shortcut-utils";
import { useShortcutRecorder } from "@/features/shortcut/use-shortcut-recorder";

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

export function ShortcutSettingsSection() {
  const { shortcuts, clearShortcut, globalShortcutError, resetShortcut, updateShortcut } =
    useShortcutState();
  const {
    clearFieldError,
    fieldErrors,
    recordingAction,
    recordingPreviewTokens,
    setRecordingAction,
  } = useShortcutRecorder({
    updateShortcut,
  });

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

      <div className="flex flex-col gap-1">
        {SHORTCUT_FIELD_DEFINITIONS.map((field) => {
          const isRecording = recordingAction === field.action;
          const shortcut = shortcuts[field.action];
          const fieldError =
            field.action === "toggle-window" &&
            shortcut !== null &&
            globalShortcutError === shortcut
              ? ("unavailable" as const)
              : (fieldErrors[field.action] ?? null);
          const shouldShowReset = shortcut !== DEFAULT_SHORTCUT_PREFERENCES[field.action];

          return (
            <div
              key={field.action}
              className="grid grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] items-start gap-4 rounded-lg"
            >
              <div className="flex h-7 min-w-0 items-center">
                <div className="text-xs font-medium">{field.title}</div>
              </div>

              <ShortcutInput
                action={field.action}
                error={fieldError}
                isRecording={isRecording}
                recordingPreviewTokens={isRecording ? recordingPreviewTokens : []}
                shouldShowReset={shouldShowReset}
                shortcut={shortcut}
                onClear={() => {
                  clearShortcut(field.action);
                  setRecordingAction(null);
                  clearFieldError(field.action);
                }}
                onReset={() => {
                  resetShortcut(field.action);
                  setRecordingAction(null);
                  clearFieldError(field.action);
                }}
                onToggleRecording={() => {
                  setRecordingAction((currentAction) =>
                    currentAction === field.action ? null : field.action,
                  );
                  clearFieldError(field.action);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
