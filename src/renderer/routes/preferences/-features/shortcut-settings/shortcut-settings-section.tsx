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
  PinIcon,
  PlusCircleIcon,
  Trash2Icon,
  WandSparklesIcon,
  XIcon,
  FlagIcon,
} from "lucide-react";
import { type ReactElement, type SVGProps } from "react";

import { ShortcutInput } from "./shortcut-input";
import { useShortcutRecorder } from "./use-shortcut-recorder";

interface ShortcutFieldDefinition {
  action: ShortcutAction;
  icon: ReactElement<SVGProps<SVGSVGElement>>;
  title: ReactElement;
  description?: ReactElement;
}

const SHORTCUT_FIELD_DEFINITIONS: ShortcutFieldDefinition[] = [
  {
    action: "toggleWindow",
    icon: <KeyboardIcon />,
    title: <Trans id="preferences.shortcuts.toggleWindow.label">Toggle window</Trans>,
  },
  {
    action: "createBlock",
    icon: <PlusCircleIcon />,
    title: <Trans id="preferences.shortcuts.createBlock.label">Create block</Trans>,
  },
  {
    action: "copyBlock",
    icon: <CopyIcon />,
    title: <Trans id="preferences.shortcuts.copyBlock.label">Copy block</Trans>,
  },
  {
    action: "keepBlock",
    icon: <FlagIcon />,
    title: <Trans id="preferences.shortcuts.keepBlock.label">Keep block</Trans>,
  },
  {
    action: "togglePinBlock",
    icon: <PinIcon />,
    title: <Trans id="preferences.shortcuts.togglePinBlock.label">Pin/unpin block</Trans>,
  },
  {
    action: "deleteBlock",
    icon: <Trash2Icon />,
    title: <Trans id="preferences.shortcuts.deleteBlock.label">Delete block</Trans>,
  },
  {
    action: "archiveBlock",
    icon: <ArchiveIcon />,
    title: <Trans id="preferences.shortcuts.archiveBlock.label">Archive/restore block</Trans>,
  },
  {
    action: "quickCreateBlock",
    icon: <WandSparklesIcon />,
    title: <Trans id="preferences.shortcuts.quickCreateBlock.label">Quick create block</Trans>,
    description: (
      <Trans id="preferences.shortcuts.quickCreateBlock.description">
        Quickly create a new block and bring the window forward for fast capture.
      </Trans>
    ),
  },
  {
    action: "submitExternalEdit",
    icon: <CheckIcon />,
    title: <Trans id="preferences.shortcuts.submitExternalEdit.label">Submit external edit</Trans>,
  },
  {
    action: "cancelExternalEdit",
    icon: <XIcon />,
    title: <Trans id="preferences.shortcuts.cancelExternalEdit.label">Cancel external edit</Trans>,
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
            (field.action === "toggleWindow" || field.action === "quickCreateBlock") &&
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
