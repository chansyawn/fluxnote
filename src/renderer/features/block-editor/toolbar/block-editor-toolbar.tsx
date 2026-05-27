import { useLingui } from "@lingui/react";
import { Button } from "@renderer/ui/components/button";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@renderer/ui/components/tooltip";
import { cn } from "@renderer/ui/lib/utils";
import { BoldIcon, Code2Icon, ItalicIcon, StrikethroughIcon, type LucideIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorTextFormat,
  type BlockEditorToolbarController,
} from "./types";

interface BlockEditorToolbarProps {
  className?: string;
  controller?: BlockEditorToolbarController | null;
  inactiveContent?: ReactNode;
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
        format: "code",
        icon: Code2Icon,
        label: i18n._({ id: "block-editor.toolbar.inline-code", message: "Inline code" }),
      },
      {
        format: "strikethrough",
        icon: StrikethroughIcon,
        label: i18n._({ id: "block-editor.toolbar.strikethrough", message: "Strikethrough" }),
      },
      {
        format: "italic",
        icon: ItalicIcon,
        label: i18n._({ id: "block-editor.toolbar.italic", message: "Italic" }),
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
              <TooltipContent>{control.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </ButtonGroup>
    </div>
  );
}
