import { useLingui } from "@lingui/react";
import { formatShortcutTokens } from "@renderer/features/shortcut/shortcut-utils";
import { Button } from "@renderer/ui/components/button";
import { ButtonGroup, ButtonGroupSeparator } from "@renderer/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from "@renderer/ui/components/dropdown-menu";
import { Kbd, KbdGroup } from "@renderer/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@renderer/ui/components/tooltip";
import { cn } from "@renderer/ui/lib/utils";
import { type MouseEvent, type ReactNode, useCallback, useMemo, useSyncExternalStore } from "react";

import {
  BLOCK_BUTTON_FORMATS,
  ChevronDownIcon,
  createToolbarFormatDefinitions,
  INLINE_FORMATS,
  LIST_FORMATS,
  TEXT_STYLE_FORMATS,
  TOOLBAR_FORMAT_ICONS,
} from "./toolbar-format-config";
import { ToolbarMenuItem, ToolbarRadioMenuItem } from "./toolbar-menu-item";
import {
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorBlockFormat,
  type BlockEditorInlineFormat,
  type BlockEditorToolbarController,
  type BlockEditorToolbarShortcuts,
} from "./types";

type TextStyleFormat = (typeof TEXT_STYLE_FORMATS)[number];
type ListFormat = (typeof LIST_FORMATS)[number];

interface BlockEditorToolbarProps {
  className?: string;
  controller?: BlockEditorToolbarController | null;
  inactiveContent?: ReactNode;
  shortcuts?: BlockEditorToolbarShortcuts;
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

function ToolbarShortcut({
  shortcut,
}: {
  shortcut?: BlockEditorToolbarShortcuts[keyof BlockEditorToolbarShortcuts];
}) {
  const shortcutTokens = formatShortcutTokens(shortcut ?? null);

  if (shortcutTokens.length === 0) {
    return null;
  }

  return (
    <KbdGroup>
      {shortcutTokens.map((token, index) => (
        <Kbd key={`${token}-${index}`}>{token}</Kbd>
      ))}
    </KbdGroup>
  );
}

function preventToolbarMouseDown(event: MouseEvent) {
  event.preventDefault();
}

function isTextStyleFormat(format: BlockEditorBlockFormat): format is TextStyleFormat {
  return (
    format === "paragraph" ||
    format === "heading1" ||
    format === "heading2" ||
    format === "heading3" ||
    format === "heading4" ||
    format === "heading5" ||
    format === "heading6"
  );
}

function isListFormat(format: BlockEditorBlockFormat): format is ListFormat {
  return format === "bulletList" || format === "orderedList" || format === "taskList";
}

export function BlockEditorToolbar({
  className,
  controller,
  inactiveContent,
  shortcuts,
}: BlockEditorToolbarProps) {
  const { i18n } = useLingui();
  const state = useBlockEditorToolbarState(controller);
  const definitions = useMemo(() => createToolbarFormatDefinitions(i18n), [i18n]);
  const textStyleFormat = isTextStyleFormat(state.blockFormat) ? state.blockFormat : "paragraph";
  const listFormat = isListFormat(state.blockFormat) ? state.blockFormat : null;
  const TextStyleIcon = TOOLBAR_FORMAT_ICONS[textStyleFormat];
  const ListIcon =
    listFormat === null ? TOOLBAR_FORMAT_ICONS.bulletList : TOOLBAR_FORMAT_ICONS[listFormat];

  const formatBlock = useCallback(
    (format: BlockEditorBlockFormat) => {
      controller?.formatBlock(format);
      controller?.focus();
    },
    [controller],
  );

  const formatInline = useCallback(
    (format: BlockEditorInlineFormat) => {
      controller?.formatInline(format);
      controller?.focus();
    },
    [controller],
  );

  if (!controller) {
    return inactiveContent ?? null;
  }

  return (
    <div
      className={cn(
        "mx-auto flex w-fit items-center rounded-md border border-muted bg-popover shadow-xs",
        className,
      )}
    >
      <ButtonGroup aria-label={i18n._({ id: "block-editor.toolbar.label", message: "Editor" })}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={definitions[textStyleFormat].label}
                className="min-w-12"
                disabled={state.blockFormattingDisabled}
                size="sm"
                type="button"
                variant="ghost"
                onMouseDown={preventToolbarMouseDown}
              >
                <TextStyleIcon data-icon="inline-start" />
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuRadioGroup
              value={textStyleFormat}
              onValueChange={(value) => {
                formatBlock(value as BlockEditorBlockFormat);
              }}
            >
              {TEXT_STYLE_FORMATS.map((format) => {
                const definition = definitions[format];
                return (
                  <ToolbarRadioMenuItem
                    key={format}
                    icon={definition.icon}
                    label={definition.label}
                    shortcut={shortcuts?.[format]}
                    value={format}
                  />
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ButtonGroupSeparator />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={i18n._({ id: "block-editor.toolbar.list", message: "List" })}
                aria-pressed={listFormat !== null}
                className={cn(listFormat !== null ? "text-foreground" : "text-muted-foreground/60")}
                disabled={state.blockFormattingDisabled}
                size="sm"
                type="button"
                variant="ghost"
                onMouseDown={preventToolbarMouseDown}
              >
                <ListIcon data-icon="inline-start" />
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" side="top">
            {LIST_FORMATS.map((format) => {
              const definition = definitions[format];
              return (
                <ToolbarMenuItem
                  key={format}
                  active={listFormat === format}
                  icon={definition.icon}
                  label={definition.label}
                  shortcut={shortcuts?.[format]}
                  onSelect={() => {
                    formatBlock(format);
                  }}
                />
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <ButtonGroupSeparator />

        {BLOCK_BUTTON_FORMATS.map((format) => {
          const definition = definitions[format];
          const Icon = definition.icon;
          const pressed = state.blockFormat === format;

          return (
            <Tooltip key={format}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={definition.label}
                    aria-pressed={pressed}
                    className={cn(pressed ? "text-foreground" : "text-muted-foreground/60")}
                    disabled={state.blockFormattingDisabled}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      formatBlock(format);
                    }}
                    onMouseDown={preventToolbarMouseDown}
                  >
                    <Icon data-icon="inline-start" />
                  </Button>
                }
              />
              <TooltipContent className="flex items-center gap-2">
                <span>{definition.label}</span>
                <ToolbarShortcut shortcut={shortcuts?.[format]} />
              </TooltipContent>
            </Tooltip>
          );
        })}

        <ButtonGroupSeparator />

        {INLINE_FORMATS.map((format) => {
          const definition = definitions[format];
          const Icon = definition.icon;
          const pressed = state.inlineFormats[format];

          return (
            <Tooltip key={format}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={definition.label}
                    aria-pressed={pressed}
                    className={cn(pressed ? "text-foreground" : "text-muted-foreground/60")}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      formatInline(format);
                    }}
                    onMouseDown={preventToolbarMouseDown}
                  >
                    <Icon data-icon="inline-start" />
                  </Button>
                }
              />
              <TooltipContent className="flex items-center gap-2">
                <span>{definition.label}</span>
                <ToolbarShortcut shortcut={shortcuts?.[format]} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ButtonGroup>
    </div>
  );
}
