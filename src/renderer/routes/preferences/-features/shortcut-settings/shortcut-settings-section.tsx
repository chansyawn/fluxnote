import { Trans } from "@lingui/react/macro";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { DEFAULT_SETTINGS, type ShortcutAction } from "@shared/features/preferences/settings";
import {
  CheckIcon,
  ArchiveIcon,
  CopyIcon,
  KeyboardIcon,
  PlusCircleIcon,
  Trash2Icon,
  WandSparklesIcon,
  XIcon,
  FlagIcon,
} from "lucide-react";
import { type ReactElement } from "react";

import { ShortcutInput } from "./shortcut-input";
import { useShortcutRecorder } from "./use-shortcut-recorder";

interface ShortcutFieldDefinition {
  action: ShortcutAction;
  icon: typeof KeyboardIcon;
  title: ReactElement;
  description?: ReactElement;
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
    action: "copy-block",
    icon: CopyIcon,
    title: <Trans id="preferences.shortcuts.copy-block.label">Copy block</Trans>,
  },
  {
    action: "keep-block",
    icon: FlagIcon,
    title: <Trans id="preferences.shortcuts.keep-block.label">Keep block</Trans>,
  },
  {
    action: "delete-block",
    icon: Trash2Icon,
    title: <Trans id="preferences.shortcuts.delete-block.label">Delete block</Trans>,
  },
  {
    action: "archive-block",
    icon: ArchiveIcon,
    title: <Trans id="preferences.shortcuts.archive-block.label">Archive/restore block</Trans>,
  },
  {
    action: "quick-create-block",
    icon: WandSparklesIcon,
    title: <Trans id="preferences.shortcuts.quick-create-block.label">Quick create block</Trans>,
    description: (
      <Trans id="preferences.shortcuts.quick-create-block.description">
        Quickly create a new block and bring the window forward for fast capture.
      </Trans>
    ),
  },
  {
    action: "submit-external-edit",
    icon: CheckIcon,
    title: (
      <Trans id="preferences.shortcuts.submit-external-edit.label">Submit external edit</Trans>
    ),
  },
  {
    action: "cancel-external-edit",
    icon: XIcon,
    title: (
      <Trans id="preferences.shortcuts.cancel-external-edit.label">Cancel external edit</Trans>
    ),
  },
];

export function ShortcutSettingsSection() {
  const { shortcuts, clearShortcut, globalShortcutErrors, resetShortcut, updateShortcut } =
    useShortcutState();
  const {
    clearFieldError,
    cancelRecording,
    feedback,
    fieldErrors,
    recordingAction,
    startRecording,
  } = useShortcutRecorder({
    clearShortcut,
    updateShortcut,
  });

  return (
    <SettingsSection title={<Trans id="preferences.shortcuts.title">Shortcuts</Trans>}>
      <SettingsGroup>
        {SHORTCUT_FIELD_DEFINITIONS.map((field) => {
          const isRecording = recordingAction === field.action;
          const shortcut = shortcuts[field.action];
          const fieldError =
            (field.action === "toggle-window" || field.action === "quick-create-block") &&
            shortcut !== null &&
            globalShortcutErrors[field.action] === shortcut
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
              description={field.description}
              icon={field.icon}
              label={field.title}
            />
          );
        })}
      </SettingsGroup>
    </SettingsSection>
  );
}
