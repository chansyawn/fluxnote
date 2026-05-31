import { Trans } from "@lingui/react/macro";
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
  BoldIcon,
  Code2Icon,
  CopyIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  KeyboardIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  PinIcon,
  PlusCircleIcon,
  QuoteIcon,
  StrikethroughIcon,
  Trash2Icon,
  TypeIcon,
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
  {
    id: "editor",
    title: <Trans id="preferences.shortcuts.group.editor">Editor</Trans>,
    fields: [
      {
        action: "editor.heading1",
        icon: <Heading1Icon />,
        title: <Trans id="preferences.shortcuts.heading1.label">Heading 1</Trans>,
      },
      {
        action: "editor.heading2",
        icon: <Heading2Icon />,
        title: <Trans id="preferences.shortcuts.heading2.label">Heading 2</Trans>,
      },
      {
        action: "editor.heading3",
        icon: <Heading3Icon />,
        title: <Trans id="preferences.shortcuts.heading3.label">Heading 3</Trans>,
      },
      {
        action: "editor.heading4",
        icon: <Heading4Icon />,
        title: <Trans id="preferences.shortcuts.heading4.label">Heading 4</Trans>,
      },
      {
        action: "editor.heading5",
        icon: <Heading5Icon />,
        title: <Trans id="preferences.shortcuts.heading5.label">Heading 5</Trans>,
      },
      {
        action: "editor.heading6",
        icon: <Heading6Icon />,
        title: <Trans id="preferences.shortcuts.heading6.label">Heading 6</Trans>,
      },
      {
        action: "editor.blockquote",
        icon: <QuoteIcon />,
        title: <Trans id="preferences.shortcuts.blockquote.label">Blockquote</Trans>,
      },
      {
        action: "editor.bulletList",
        icon: <ListIcon />,
        title: <Trans id="preferences.shortcuts.bulletList.label">Bullet list</Trans>,
      },
      {
        action: "editor.orderedList",
        icon: <ListOrderedIcon />,
        title: <Trans id="preferences.shortcuts.orderedList.label">Ordered list</Trans>,
      },
      {
        action: "editor.codeBlock",
        icon: <Code2Icon />,
        title: <Trans id="preferences.shortcuts.codeBlock.label">Code block</Trans>,
      },
      {
        action: "editor.paragraph",
        icon: <TypeIcon />,
        title: <Trans id="preferences.shortcuts.paragraph.label">Paragraph</Trans>,
      },
      {
        action: "editor.bold",
        icon: <BoldIcon />,
        title: <Trans id="preferences.shortcuts.bold.label">Bold</Trans>,
      },
      {
        action: "editor.italic",
        icon: <ItalicIcon />,
        title: <Trans id="preferences.shortcuts.italic.label">Italic</Trans>,
      },
      {
        action: "editor.strikethrough",
        icon: <StrikethroughIcon />,
        title: <Trans id="preferences.shortcuts.strikethrough.label">Strikethrough</Trans>,
      },
      {
        action: "editor.inlineCode",
        icon: <Code2Icon />,
        title: <Trans id="preferences.shortcuts.inlineCode.label">Inline code</Trans>,
      },
      {
        action: "editor.link",
        icon: <LinkIcon />,
        title: <Trans id="preferences.shortcuts.link.label">Link</Trans>,
      },
    ],
  },
];

export function ShortcutPreferencesSection() {
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
    <PreferencesSection title={<Trans id="preferences.shortcuts.title">Shortcuts</Trans>}>
      <div className="flex flex-col gap-3">
        {SHORTCUT_FIELD_GROUPS.map((group) => (
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
