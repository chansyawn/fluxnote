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
import { ChevronDownIcon } from "lucide-react";
import { type MouseEvent, type ReactNode, useCallback, useRef, useSyncExternalStore } from "react";

import {
  BLOCK_EDITOR_ACTION_DEFINITIONS,
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  type BlockEditorActionController,
  type BlockEditorActionDefinition,
  type BlockEditorActionId,
  type BlockEditorActionState,
  type BlockEditorShortcutConfig,
} from "../actions";
import { ToolbarMenuItem, ToolbarRadioMenuItem } from "./toolbar-menu-item";
import type { BlockEditorBlockFormat } from "./types";

const TEXT_STYLE_ACTIONS = BLOCK_EDITOR_ACTION_DEFINITIONS.filter(
  (action) => action.group === "text-style",
);
const LIST_ACTIONS = BLOCK_EDITOR_ACTION_DEFINITIONS.filter((action) => action.group === "list");
const BLOCK_BUTTON_ACTIONS = BLOCK_EDITOR_ACTION_DEFINITIONS.filter(
  (action) => action.group === "block-button",
);
const INLINE_ACTIONS = BLOCK_EDITOR_ACTION_DEFINITIONS.filter(
  (action) => action.group === "inline",
);

interface BlockEditorToolbarProps {
  className?: string;
  controller?: BlockEditorActionController | null;
  inactiveContent?: ReactNode;
  shortcuts?: BlockEditorShortcutConfig;
}

function useBlockEditorActionState(controller: BlockEditorActionController | null | undefined) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return controller?.subscribeActionState(onStoreChange) ?? (() => undefined);
    },
    [controller],
  );

  const getSnapshot = useCallback(
    () => controller?.getActionState() ?? DEFAULT_BLOCK_EDITOR_ACTION_STATE,
    [controller],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_BLOCK_EDITOR_ACTION_STATE);
}

function ToolbarShortcut({
  shortcut,
}: {
  shortcut?: BlockEditorShortcutConfig[BlockEditorActionId];
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

function isBlockAction(
  action: BlockEditorActionDefinition,
): action is BlockEditorActionDefinition<BlockEditorBlockFormat> {
  return action.kind === "block-format";
}

function findActiveTextStyleAction(state: BlockEditorActionState) {
  return (
    TEXT_STYLE_ACTIONS.find(
      (action) => isBlockAction(action) && action.format === state.blockFormat,
    ) ?? TEXT_STYLE_ACTIONS[0]
  );
}

function findActiveListAction(state: BlockEditorActionState) {
  return LIST_ACTIONS.find(
    (action) => isBlockAction(action) && action.format === state.blockFormat,
  );
}

export function BlockEditorToolbar({
  className,
  controller,
  inactiveContent,
  shortcuts,
}: BlockEditorToolbarProps) {
  const { i18n } = useLingui();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const state = useBlockEditorActionState(controller);
  const textStyleAction = findActiveTextStyleAction(state);
  const listAction = findActiveListAction(state);
  const TextStyleIcon = textStyleAction.icon;
  const ListIcon = (listAction ?? LIST_ACTIONS[0]).icon;

  const executeAction = useCallback(
    (action: BlockEditorActionId) => {
      controller?.executeAction(action);
      controller?.focus();
    },
    [controller],
  );

  if (!controller) {
    return inactiveContent ?? null;
  }

  return (
    <div
      ref={toolbarRef}
      className={cn(
        "mx-auto flex w-fit items-center rounded-lg border border-muted bg-popover p-1 shadow-xs",
        className,
      )}
      onMouseDown={preventToolbarMouseDown}
    >
      <ButtonGroup aria-label={i18n._({ id: "block-editor.toolbar.label", message: "Editor" })}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={i18n._(textStyleAction.label)}
                className="min-w-12"
                disabled={state.disabledActions[textStyleAction.id]}
                size="sm"
                type="button"
                variant="ghost"
              >
                <TextStyleIcon data-icon="inline-start" />
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent
            align="start"
            className="w-auto min-w-44"
            container={toolbarRef}
            side="top"
          >
            <DropdownMenuRadioGroup
              value={textStyleAction.id}
              onValueChange={(value) => {
                executeAction(value as BlockEditorActionId);
              }}
            >
              {TEXT_STYLE_ACTIONS.map((action) => (
                <ToolbarRadioMenuItem
                  key={action.id}
                  icon={action.icon}
                  label={i18n._(action.label)}
                  shortcut={shortcuts?.[action.id]}
                  value={action.id}
                />
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <ButtonGroupSeparator />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={i18n._({ id: "block-editor.toolbar.list", message: "List" })}
                aria-pressed={listAction !== undefined}
                className={cn(
                  listAction !== undefined ? "text-foreground" : "text-muted-foreground/60",
                )}
                disabled={LIST_ACTIONS.every((action) => state.disabledActions[action.id])}
                size="sm"
                type="button"
                variant="ghost"
              >
                <ListIcon data-icon="inline-start" />
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent
            align="start"
            className="w-auto min-w-44"
            container={toolbarRef}
            side="top"
          >
            {LIST_ACTIONS.map((action) => (
              <ToolbarMenuItem
                key={action.id}
                active={listAction?.id === action.id}
                icon={action.icon}
                label={i18n._(action.label)}
                shortcut={shortcuts?.[action.id]}
                onSelect={() => {
                  executeAction(action.id);
                }}
              />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ButtonGroupSeparator />

        {BLOCK_BUTTON_ACTIONS.map((action) => {
          const Icon = action.icon;
          const pressed = isBlockAction(action) && state.blockFormat === action.format;
          const label = i18n._(action.label);

          return (
            <Tooltip key={action.id}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={label}
                    aria-pressed={pressed}
                    className={cn(pressed ? "text-foreground" : "text-muted-foreground/60")}
                    disabled={state.disabledActions[action.id]}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      executeAction(action.id);
                    }}
                  >
                    <Icon data-icon="inline-start" />
                  </Button>
                }
              />
              <TooltipContent className="flex items-center gap-2">
                <span>{label}</span>
                <ToolbarShortcut shortcut={shortcuts?.[action.id]} />
              </TooltipContent>
            </Tooltip>
          );
        })}

        <ButtonGroupSeparator />

        {INLINE_ACTIONS.map((action) => {
          const Icon = action.icon;
          const pressed = action.kind === "inline-format" && state.inlineFormats[action.format];
          const label = i18n._(action.label);

          return (
            <Tooltip key={action.id}>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={label}
                    aria-pressed={pressed}
                    className={cn(pressed ? "text-foreground" : "text-muted-foreground/60")}
                    disabled={state.disabledActions[action.id]}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      executeAction(action.id);
                    }}
                  >
                    <Icon data-icon="inline-start" />
                  </Button>
                }
              />
              <TooltipContent className="flex items-center gap-2">
                <span>{label}</span>
                <ToolbarShortcut shortcut={shortcuts?.[action.id]} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </ButtonGroup>
    </div>
  );
}
