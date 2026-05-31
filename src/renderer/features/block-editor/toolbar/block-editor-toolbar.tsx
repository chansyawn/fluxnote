import { useLingui } from "@lingui/react";
import type { BlockEditorShortcuts } from "@renderer/features/block-editor/core/types";
import { formatShortcutTokens } from "@renderer/features/shortcut/shortcut-utils";
import { Button } from "@renderer/ui/components/button";
import { ButtonGroup, ButtonGroupSeparator } from "@renderer/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@renderer/ui/components/dropdown-menu";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@renderer/ui/components/tooltip";
import { cn } from "@renderer/ui/lib/utils";
import {
  BoldIcon,
  ChevronDownIcon,
  Code2Icon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  StrikethroughIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useCallback, useMemo, useSyncExternalStore } from "react";

import {
  BLOCK_EDITOR_FORMAT_SHORTCUT_ACTIONS,
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorBlockFormat,
  type BlockEditorInlineFormat,
  type BlockEditorToolbarCommand,
  type BlockEditorToolbarController,
  type BlockEditorToolbarFormat,
} from "./types";

interface BlockEditorToolbarProps {
  className?: string;
  controller?: BlockEditorToolbarController | null;
  inactiveContent?: ReactNode;
  shortcuts?: Partial<BlockEditorShortcuts>;
}

interface ToolbarButtonControl<TFormat extends BlockEditorToolbarFormat> {
  format: TFormat;
  icon: LucideIcon;
  label: string;
}

interface HeadingControl {
  format: Extract<
    BlockEditorBlockFormat,
    "paragraph" | "heading1" | "heading2" | "heading3" | "heading4" | "heading5" | "heading6"
  >;
  icon: LucideIcon;
  label: string;
  menuLabel: string;
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

function getShortcutTokens(
  shortcuts: Partial<BlockEditorShortcuts> | undefined,
  format: BlockEditorToolbarFormat,
) {
  return formatShortcutTokens(shortcuts?.[BLOCK_EDITOR_FORMAT_SHORTCUT_ACTIONS[format]] ?? null);
}

function getShortcutLabel(
  shortcuts: Partial<BlockEditorShortcuts> | undefined,
  format: BlockEditorToolbarFormat,
) {
  return getShortcutTokens(shortcuts, format).join("+");
}

function ShortcutTooltipContent({
  format,
  label,
  shortcuts,
}: {
  format: BlockEditorToolbarFormat;
  label: string;
  shortcuts?: Partial<BlockEditorShortcuts>;
}) {
  const shortcutTokens = getShortcutTokens(shortcuts, format);

  return (
    <TooltipContent className="flex items-center gap-2">
      <span>{label}</span>
      {shortcutTokens.length > 0 ? (
        <KbdGroup>
          {shortcutTokens.map((token, index) => (
            <Kbd key={`${format}-${token}-${index}`}>{token}</Kbd>
          ))}
        </KbdGroup>
      ) : null}
    </TooltipContent>
  );
}

function ToolbarIconButton<TFormat extends BlockEditorToolbarFormat>({
  active,
  command,
  control,
  controller,
  shortcuts,
}: {
  active: boolean;
  command: BlockEditorToolbarCommand;
  control: ToolbarButtonControl<TFormat>;
  controller: BlockEditorToolbarController;
  shortcuts?: Partial<BlockEditorShortcuts>;
}) {
  const Icon = control.icon;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={control.label}
            aria-pressed={active}
            className={cn(active ? "text-foreground" : "text-muted-foreground/60")}
            size="icon-sm"
            type="button"
            variant="ghost"
            onClick={() => {
              controller.runToolbarCommand(command);
              controller.focus();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
          >
            <Icon data-icon="inline-start" />
          </Button>
        }
      />
      <ShortcutTooltipContent format={control.format} label={control.label} shortcuts={shortcuts} />
    </Tooltip>
  );
}

export function BlockEditorToolbar({
  className,
  controller,
  inactiveContent,
  shortcuts,
}: BlockEditorToolbarProps) {
  const { i18n } = useLingui();
  const state = useBlockEditorToolbarState(controller);
  const headingControls = useMemo<HeadingControl[]>(
    () => [
      {
        format: "paragraph",
        icon: TypeIcon,
        label: i18n._({ id: "block-editor.toolbar.paragraph.short", message: "Text" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.paragraph", message: "Normal text" }),
      },
      {
        format: "heading1",
        icon: Heading1Icon,
        label: i18n._({ id: "block-editor.toolbar.heading1.short", message: "H1" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.heading1", message: "Heading 1" }),
      },
      {
        format: "heading2",
        icon: Heading2Icon,
        label: i18n._({ id: "block-editor.toolbar.heading2.short", message: "H2" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.heading2", message: "Heading 2" }),
      },
      {
        format: "heading3",
        icon: Heading3Icon,
        label: i18n._({ id: "block-editor.toolbar.heading3.short", message: "H3" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.heading3", message: "Heading 3" }),
      },
      {
        format: "heading4",
        icon: Heading4Icon,
        label: i18n._({ id: "block-editor.toolbar.heading4.short", message: "H4" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.heading4", message: "Heading 4" }),
      },
      {
        format: "heading5",
        icon: Heading5Icon,
        label: i18n._({ id: "block-editor.toolbar.heading5.short", message: "H5" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.heading5", message: "Heading 5" }),
      },
      {
        format: "heading6",
        icon: Heading6Icon,
        label: i18n._({ id: "block-editor.toolbar.heading6.short", message: "H6" }),
        menuLabel: i18n._({ id: "block-editor.toolbar.heading6", message: "Heading 6" }),
      },
    ],
    [i18n],
  );
  const blockControls = useMemo<ToolbarButtonControl<BlockEditorBlockFormat>[]>(
    () => [
      {
        format: "blockquote",
        icon: QuoteIcon,
        label: i18n._({ id: "block-editor.toolbar.blockquote", message: "Quote" }),
      },
      {
        format: "bulletList",
        icon: ListIcon,
        label: i18n._({ id: "block-editor.toolbar.bullet-list", message: "Bullet list" }),
      },
      {
        format: "orderedList",
        icon: ListOrderedIcon,
        label: i18n._({ id: "block-editor.toolbar.ordered-list", message: "Numbered list" }),
      },
      {
        format: "codeBlock",
        icon: CodeIcon,
        label: i18n._({ id: "block-editor.toolbar.code-block", message: "Code block" }),
      },
    ],
    [i18n],
  );
  const inlineControls = useMemo<ToolbarButtonControl<BlockEditorInlineFormat>[]>(
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
        format: "inlineCode",
        icon: Code2Icon,
        label: i18n._({ id: "block-editor.toolbar.inline-code", message: "Inline code" }),
      },
    ],
    [i18n],
  );

  if (!controller) {
    return inactiveContent ?? null;
  }

  const activeHeading =
    headingControls.find((control) => control.format === state.blockFormat) ?? headingControls[0];
  const ActiveHeadingIcon = activeHeading.icon;

  return (
    <div
      className={cn(
        "mx-auto flex w-fit items-center rounded-lg border border-muted bg-popover p-1 shadow-xs",
        className,
      )}
      data-block-editor-toolbar
    >
      <ButtonGroup aria-label={i18n._({ id: "block-editor.toolbar.label", message: "Editor" })}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  aria-label={i18n._({
                    id: "block-editor.toolbar.heading-menu",
                    message: "Text style",
                  })}
                  render={<Button size="sm" type="button" variant="ghost" />}
                >
                  <ActiveHeadingIcon data-icon="inline-start" />
                  <ChevronDownIcon data-icon="inline-end" />
                </DropdownMenuTrigger>
              }
            />
            <ShortcutTooltipContent
              format={activeHeading.format}
              label={activeHeading.menuLabel}
              shortcuts={shortcuts}
            />
          </Tooltip>
          <DropdownMenuContent className="w-auto min-w-44" data-block-editor-toolbar>
            <DropdownMenuRadioGroup value={state.blockFormat}>
              <DropdownMenuGroup>
                {headingControls.map((control) => {
                  const Icon = control.icon;
                  const shortcutLabel = getShortcutLabel(shortcuts, control.format);

                  return (
                    <DropdownMenuRadioItem
                      key={control.format}
                      value={control.format}
                      onClick={() => {
                        controller.runToolbarCommand({
                          format: control.format,
                          type: "set-block",
                        });
                        controller.focus();
                      }}
                    >
                      <Icon />
                      {control.menuLabel}
                      {shortcutLabel ? (
                        <DropdownMenuShortcut>{shortcutLabel}</DropdownMenuShortcut>
                      ) : null}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuGroup>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ButtonGroupSeparator />
        {blockControls.map((control) => (
          <ToolbarIconButton
            key={control.format}
            active={state.activeBlocks[control.format]}
            command={{ format: control.format, type: "set-block" }}
            control={control}
            controller={controller}
            shortcuts={shortcuts}
          />
        ))}
        <ButtonGroupSeparator />
        {inlineControls.map((control) => (
          <ToolbarIconButton
            key={control.format}
            active={state.inlineFormats[control.format]}
            command={{ format: control.format, type: "toggle-inline" }}
            control={control}
            controller={controller}
            shortcuts={shortcuts}
          />
        ))}
      </ButtonGroup>
    </div>
  );
}
