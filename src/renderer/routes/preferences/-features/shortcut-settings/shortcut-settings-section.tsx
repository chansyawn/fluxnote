import { Trans } from "@lingui/react/macro";
import {
  DEFAULT_SETTINGS,
  type ShortcutAction,
} from "@renderer/app/preferences/preferences-schema";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { KeyboardIcon, PanelTopOpenIcon, PlusCircleIcon } from "lucide-react";
import { type ReactElement } from "react";

import { ShortcutInput } from "./shortcut-input";
import { useShortcutRecorder } from "./use-shortcut-recorder";

interface ShortcutFieldDefinition {
  action: ShortcutAction;
  icon: typeof KeyboardIcon;
  title: ReactElement;
}

const SHORTCUT_FIELD_DEFINITIONS: ShortcutFieldDefinition[] = [
  {
    action: "toggle-window",
    icon: KeyboardIcon,
    title: <Trans id="preferences.shortcuts.toggle-window.label">Toggle window</Trans>,
  },
  {
    action: "create-block",
    icon: PlusCircleIcon,
    title: <Trans id="preferences.shortcuts.create-block.label">Create block</Trans>,
  },
  {
    action: "delete-block",
    icon: PanelTopOpenIcon,
    title: <Trans id="preferences.shortcuts.delete-block.label">Delete block</Trans>,
  },
];

export function ShortcutSettingsSection() {
  const { shortcuts, clearShortcut, globalShortcutError, resetShortcut, updateShortcut } =
    useShortcutState();
  const {
    clearFieldError,
    cancelRecording,
    feedback,
    fieldErrors,
    recordingAction,
    startRecording,
  } = useShortcutRecorder({
    updateShortcut,
  });

  return (
    <SettingsSection title={<Trans id="preferences.shortcuts.title">Shortcuts</Trans>}>
      <SettingsGroup>
        {SHORTCUT_FIELD_DEFINITIONS.map((field) => {
          const isRecording = recordingAction === field.action;
          const shortcut = shortcuts[field.action];
          const fieldError =
            field.action === "toggle-window" &&
            shortcut !== null &&
            globalShortcutError === shortcut
              ? ("unavailable" as const)
              : (fieldErrors[field.action] ?? null);
          const shouldShowReset = shortcut !== DEFAULT_SETTINGS.shortcuts[field.action];

          return (
            <SettingsRow
              key={field.action}
              control={
                <ShortcutInput
                  action={field.action}
                  error={fieldError}
                  feedback={isRecording ? feedback : null}
                  shouldShowReset={shouldShowReset}
                  shortcut={shortcut}
                  onClear={() => {
                    clearShortcut(field.action);
                    cancelRecording();
                    clearFieldError(field.action);
                  }}
                  onCancelRecording={cancelRecording}
                  onReset={() => {
                    resetShortcut(field.action);
                    cancelRecording();
                    clearFieldError(field.action);
                  }}
                  onStartRecording={() => {
                    if (isRecording) {
                      cancelRecording();
                      return;
                    }

                    startRecording(field.action);
                    clearFieldError(field.action);
                  }}
                />
              }
              icon={field.icon}
              label={field.title}
            />
          );
        })}
      </SettingsGroup>
    </SettingsSection>
  );
}
