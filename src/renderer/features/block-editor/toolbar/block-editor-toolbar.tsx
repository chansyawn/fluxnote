import { useLingui } from "@lingui/react";
import type { BlockEditorShortcuts } from "@renderer/features/block-editor/core/types";
import { formatShortcutTokens } from "@renderer/features/shortcut/shortcut-utils";
import { Button } from "@renderer/ui/components/button";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@renderer/ui/components/tooltip";
import { cn } from "@renderer/ui/lib/utils";
import { BoldIcon, Code2Icon, ItalicIcon, StrikethroughIcon, type LucideIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorTextFormat,
  type BlockEditorToolbarController,
  BLOCK_EDITOR_TEXT_FORMAT_SHORTCUT_ACTIONS,
} from "./types";

interface BlockEditorToolbarProps {
  className?: string;
  controller?: BlockEditorToolbarController | null;
  inactiveContent?: ReactNode;
  shortcuts?: Partial<BlockEditorShortcuts>;
}

interface TextFormatControl {
  format: BlockEditorTextFormat;
  icon: LucideIcon;
  label: string;
}

function useBlockEditorToolbarState(controller: BlockEditorToolbarController | null | undefined) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return controller?.subscribeToolbarState(onStoreChange) ?? (() => undefined);
    },
    [controller],
  );

  const getSnapshot = useCallback(
    () => controller?.getToolbarState() ?? DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
    [controller],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE);
}

export function BlockEditorToolbar({
  className,
  controller,
  inactiveContent,
  shortcuts,
}: BlockEditorToolbarProps) {
  const { i18n } = useLingui();
  const state = useBlockEditorToolbarState(controller);
  const textFormatControls = useMemo<TextFormatControl[]>(
    () => [
      {
        format: "bold",
        icon: BoldIcon,
        label: i18n._({ id: "block-editor.toolbar.bold", message: "Bold" }),
      },
      {
        format: "italic",
        icon: ItalicIcon,
        label: i18n._({ id: "block-editor.toolbar.italic", message: "Italic" }),
      },
      {
        format: "strikethrough",
        icon: StrikethroughIcon,
        label: i18n._({ id: "block-editor.toolbar.strikethrough", message: "Strikethrough" }),
      },
      {
        format: "code",
        icon: Code2Icon,
        label: i18n._({ id: "block-editor.toolbar.inline-code", message: "Inline code" }),
      },
    ],
    [i18n],
  );

  if (!controller) {
    return inactiveContent ?? null;
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-fit items-center rounded-xl border border-muted bg-popover shadow-xs p-1",
        className,
      )}
    >
      <ButtonGroup aria-label={i18n._({ id: "block-editor.toolbar.label", message: "Editor" })}>
        {textFormatControls.map((control) => {
          const Icon = control.icon;
          const pressed = state.textFormats[control.format];
          const shortcutAction = BLOCK_EDITOR_TEXT_FORMAT_SHORTCUT_ACTIONS[control.format];
          const shortcutTokens = formatShortcutTokens(shortcuts?.[shortcutAction] ?? null);

          return (
            <Tooltip key={control.format}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={control.label}
                    aria-pressed={pressed}
                    className={cn(pressed ? "text-foreground" : "text-muted-foreground/60")}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      controller.formatText(control.format);
                      controller.focus();
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                    }}
                  >
                    <Icon data-icon="inline-start" className="size-4" />
                  </Button>
                }
              />
              <TooltipContent className="flex items-center gap-2">
                <span>{control.label}</span>
                {shortcutTokens.length > 0 ? (
                  <KbdGroup>
                    {shortcutTokens.map((token, index) => (
                      <Kbd key={`${control.format}-${token}-${index}`}>{token}</Kbd>
                    ))}
                  </KbdGroup>
                ) : null}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ButtonGroup>
    </div>
  );
}
