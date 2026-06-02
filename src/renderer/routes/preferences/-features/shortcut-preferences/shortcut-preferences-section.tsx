import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  getBlockEditorActionDefinition,
  type BlockEditorActionId,
} from "@renderer/features/block-editor";
import { useShortcutState } from "@renderer/features/shortcut/shortcut-state";
import {
  PreferencesGroup,
  PreferencesRow,
  PreferencesSection,
} from "@renderer/routes/preferences/-features/preferences-list";
import {
  DEFAULT_USER_PREFERENCES,
  type ShortcutAction,
} from "@shared/features/preferences/user-preferences";
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
  title: ReactElement | string;
  description?: ReactElement;
}

interface ShortcutFieldGroupDefinition {
  id: string;
  title: ReactElement;
  fields: ShortcutFieldDefinition[];
}

const SHORTCUT_FIELD_GROUPS: ShortcutFieldGroupDefinition[] = [
  {
    id: "global",
    title: <Trans id="preferences.shortcuts.group.global">Global</Trans>,
    fields: [
      {
        action: "global.toggleWindow",
        icon: <KeyboardIcon />,
        title: <Trans id="preferences.shortcuts.toggleWindow.label">Toggle window</Trans>,
      },
      {
        action: "global.quickCreateBlock",
        icon: <WandSparklesIcon />,
        title: <Trans id="preferences.shortcuts.quickCreateBlock.label">Quick create block</Trans>,
        description: (
          <Trans id="preferences.shortcuts.quickCreateBlock.description">
            Quickly create a new block and bring the window forward for fast capture.
          </Trans>
        ),
      },
    ],
  },
  {
    id: "workspace",
    title: <Trans id="preferences.shortcuts.group.workspace">Workspace</Trans>,
    fields: [
      {
        action: "workspace.createBlock",
        icon: <PlusCircleIcon />,
        title: <Trans id="preferences.shortcuts.createBlock.label">Create block</Trans>,
      },
      {
        action: "workspace.copyBlock",
        icon: <CopyIcon />,
        title: <Trans id="preferences.shortcuts.copyBlock.label">Copy block</Trans>,
      },
      {
        action: "workspace.keepBlock",
        icon: <FlagIcon />,
        title: <Trans id="preferences.shortcuts.keepBlock.label">Keep block</Trans>,
      },
      {
        action: "workspace.togglePinBlock",
        icon: <PinIcon />,
        title: <Trans id="preferences.shortcuts.togglePinBlock.label">Pin/unpin block</Trans>,
      },
      {
        action: "workspace.deleteBlock",
        icon: <Trash2Icon />,
        title: <Trans id="preferences.shortcuts.deleteBlock.label">Delete block</Trans>,
      },
      {
        action: "workspace.archiveBlock",
        icon: <ArchiveIcon />,
        title: <Trans id="preferences.shortcuts.archiveBlock.label">Archive/restore block</Trans>,
      },
      {
        action: "workspace.submitExternalEdit",
        icon: <CheckIcon />,
        title: (
          <Trans id="preferences.shortcuts.submitExternalEdit.label">Submit external edit</Trans>
        ),
      },
      {
        action: "workspace.cancelExternalEdit",
        icon: <XIcon />,
        title: (
          <Trans id="preferences.shortcuts.cancelExternalEdit.label">Cancel external edit</Trans>
        ),
      },
    ],
  },
];

const EDITOR_SHORTCUT_ACTION_ORDER = [
  "editor.paragraph",
  "editor.heading1",
  "editor.heading2",
  "editor.heading3",
  "editor.heading4",
  "editor.heading5",
  "editor.heading6",
  "editor.orderedList",
  "editor.bulletList",
  "editor.taskList",
  "editor.blockquote",
  "editor.codeBlock",
  "editor.bold",
  "editor.italic",
  "editor.strikethrough",
  "editor.inlineCode",
] as const satisfies readonly BlockEditorActionId[];

export function ShortcutPreferencesSection() {
  const { i18n } = useLingui();
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
  const shortcutFieldGroups: ShortcutFieldGroupDefinition[] = [
    ...SHORTCUT_FIELD_GROUPS,
    {
      id: "editor",
      title: <Trans id="preferences.shortcuts.group.editor">Editor</Trans>,
      fields: EDITOR_SHORTCUT_ACTION_ORDER.map((actionId) => {
        const action = getBlockEditorActionDefinition(actionId);
        const Icon = action.icon;
        return {
          action: action.id,
          icon: <Icon />,
          title: i18n._(action.label),
        };
      }),
    },
  ];

  return (
    <PreferencesSection title={<Trans id="preferences.shortcuts.title">Shortcuts</Trans>}>
      <div className="flex flex-col gap-3">
        {shortcutFieldGroups.map((group) => (
          <div key={group.id} className="flex flex-col gap-1.5">
            <h3 className="text-muted-foreground px-1 text-xs font-medium">{group.title}</h3>
            <PreferencesGroup>
              {group.fields.map((field) => {
                const isRecording = recordingAction === field.action;
                const shortcut = shortcuts[field.action];
                const fieldError =
                  (field.action === "global.toggleWindow" ||
                    field.action === "global.quickCreateBlock") &&
                  shortcut !== null &&
                  globalShortcutErrors[field.action] === shortcut
                    ? ("unavailable" as const)
                    : (fieldErrors[field.action] ?? null);
                const shouldShowReset =
                  shortcut !== DEFAULT_USER_PREFERENCES.shortcuts[field.action];

                return (
                  <PreferencesRow
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
            </PreferencesGroup>
          </div>
        ))}
      </div>
    </PreferencesSection>
  );
}
