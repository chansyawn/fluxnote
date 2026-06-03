import { Button } from "@fluxnotes/ui/components/button";
import { ButtonGroup, ButtonGroupSeparator } from "@fluxnotes/ui/components/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuTrigger,
} from "@fluxnotes/ui/components/dropdown-menu";
import { Kbd, KbdGroup } from "@fluxnotes/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@fluxnotes/ui/components/tooltip";
import { cn } from "@fluxnotes/ui/lib/utils";
import { useLingui } from "@lingui/react";
import { formatShortcutTokens } from "@renderer/features/shortcut/shortcut-utils";
import { ChevronDownIcon } from "lucide-react";
import { type MouseEvent, type ReactNode, useCallback, useRef, useSyncExternalStore } from "react";

import {
  DEFAULT_BLOCK_EDITOR_ACTION_STATE,
  getBlockEditorActionDefinition,
  type BlockEditorActionController,
  type BlockEditorActionId,
  type BlockEditorActionState,
  type BlockEditorShortcutConfig,
} from "../actions";
import { BLOCK_EDITOR_TOOLBAR_LAYOUT } from "./action-layout";
import { ToolbarMenuItem, ToolbarRadioMenuItem } from "./toolbar-menu-item";

const TEXT_STYLE_ACTIONS = BLOCK_EDITOR_TOOLBAR_LAYOUT.textStyleMenu.map(
  getBlockEditorActionDefinition,
);
const LIST_ACTIONS = BLOCK_EDITOR_TOOLBAR_LAYOUT.listMenu.map(getBlockEditorActionDefinition);
const BLOCK_BUTTON_ACTIONS = BLOCK_EDITOR_TOOLBAR_LAYOUT.blockButtons.map(
  getBlockEditorActionDefinition,
);
const INLINE_ACTIONS = BLOCK_EDITOR_TOOLBAR_LAYOUT.inlineButtons.map(
  getBlockEditorActionDefinition,
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

function findActiveTextStyleAction(state: BlockEditorActionState) {
  return (
    TEXT_STYLE_ACTIONS.find((action) => state.activeActions[action.id]) ?? TEXT_STYLE_ACTIONS[0]
  );
}

function findActiveListAction(state: BlockEditorActionState) {
  return LIST_ACTIONS.find((action) => state.activeActions[action.id]);
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
      const result = controller?.executeAction(action);
      if (result?.status === "executed" && result.focus === "editor") {
        controller?.focus();
      }
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

        {BLOCK_BUTTON_ACTIONS.map((action) => {
          const Icon = action.icon;
          const pressed = state.activeActions[action.id];
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
          const pressed = state.activeActions[action.id];
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
