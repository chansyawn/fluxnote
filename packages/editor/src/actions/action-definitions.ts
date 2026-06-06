import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND } from "lexical";

import {
  isBlockFormattingDisabledAtSelection,
  isListFormatActiveAtSelection,
  isQuoteActiveAtSelection,
  isTextStyleActiveAtSelection,
  toggleListFormatAtSelection,
  toggleQuoteAtSelection,
  toggleTextStyleAtSelection,
} from "../core/block-format";
import {
  executeLinkActionAtSelection,
  isLinkActionDisabledAtSelection,
  isMarkdownLinkActiveAtSelection,
} from "../syntax/link/link-action";
import { BLOCK_EDITOR_ACTION_CATALOG, type BlockEditorActionCatalogItem } from "./action-catalog";
import type {
  BlockEditorActionContext,
  BlockEditorActionDefinition,
  BlockEditorActionId,
  BlockEditorActionResult,
  BlockEditorActionFocus,
} from "./types";

function disabledActionResult(action: BlockEditorActionId): BlockEditorActionResult {
  return { action, status: "disabled" };
}

function executedActionResult(
  action: BlockEditorActionId,
  focus: BlockEditorActionFocus = "editor",
): BlockEditorActionResult {
  return { action, focus, status: "executed" };
}

function createBlockActionDefinition(
  action: Pick<BlockEditorActionDefinition, "icon" | "id" | "isActive" | "label">,
  execute: () => void,
): BlockEditorActionDefinition {
  return {
    ...action,
    isDisabled: () => isBlockFormattingDisabledAtSelection(),
    execute: ({ editor }) => {
      const disabled = editor.getEditorState().read(() => isBlockFormattingDisabledAtSelection());
      if (disabled) {
        return disabledActionResult(action.id);
      }

      editor.update(execute, { discrete: true });
      return executedActionResult(action.id);
    },
  };
}

function createTextStyleActionDefinition(action: BlockEditorActionCatalogItem) {
  if (action.execution.kind !== "text-style") {
    throw new Error(`Expected text-style action: ${action.id}`);
  }
  const { format } = action.execution;

  return createBlockActionDefinition(
    {
      icon: action.icon,
      id: action.id,
      isActive: () => isTextStyleActiveAtSelection(format),
      label: action.label,
    },
    () => {
      toggleTextStyleAtSelection(format);
    },
  );
}

function createListActionDefinition(action: BlockEditorActionCatalogItem) {
  if (action.execution.kind !== "list-format") {
    throw new Error(`Expected list-format action: ${action.id}`);
  }
  const { format } = action.execution;

  return createBlockActionDefinition(
    {
      icon: action.icon,
      id: action.id,
      isActive: () => isListFormatActiveAtSelection(format),
      label: action.label,
    },
    () => {
      toggleListFormatAtSelection(format);
    },
  );
}

function createQuoteActionDefinition(action: BlockEditorActionCatalogItem) {
  if (action.execution.kind !== "quote") {
    throw new Error(`Expected quote action: ${action.id}`);
  }

  return createBlockActionDefinition(
    {
      icon: action.icon,
      id: action.id,
      isActive: () => isQuoteActiveAtSelection(),
      label: action.label,
    },
    toggleQuoteAtSelection,
  );
}

function createInlineActionDefinition(action: BlockEditorActionCatalogItem) {
  if (action.execution.kind !== "inline-format") {
    throw new Error(`Expected inline-format action: ${action.id}`);
  }
  const { lexicalFormat } = action.execution;

  return {
    icon: action.icon,
    id: action.id,
    isActive: () => {
      const selection = $getSelection();
      return $isRangeSelection(selection) && selection.hasFormat(lexicalFormat);
    },
    isDisabled: () => false,
    label: action.label,
    execute: (context: BlockEditorActionContext) => {
      const { editor } = context;
      editor.update(
        () => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, lexicalFormat);
        },
        { discrete: true },
      );
      return executedActionResult(action.id);
    },
  };
}

function createLinkActionDefinition(action: BlockEditorActionCatalogItem) {
  if (action.execution.kind !== "link") {
    throw new Error(`Expected link action: ${action.id}`);
  }

  return {
    icon: action.icon,
    id: action.id,
    isActive: () => isMarkdownLinkActiveAtSelection(),
    isDisabled: () => isLinkActionDisabledAtSelection(),
    label: action.label,
    execute: (context: BlockEditorActionContext) => {
      const { editor } = context;
      const result = executeLinkActionAtSelection(editor);
      if (result.kind === "disabled") {
        return disabledActionResult(action.id);
      }

      if (result.kind === "created") {
        return executedActionResult(action.id, "managed");
      }

      return executedActionResult(action.id);
    },
  };
}

function createActionDefinition(action: BlockEditorActionCatalogItem): BlockEditorActionDefinition {
  switch (action.execution.kind) {
    case "inline-format":
      return createInlineActionDefinition(action);
    case "link":
      return createLinkActionDefinition(action);
    case "list-format":
      return createListActionDefinition(action);
    case "quote":
      return createQuoteActionDefinition(action);
    case "text-style":
      return createTextStyleActionDefinition(action);
  }
}

export const BLOCK_EDITOR_ACTION_DEFINITIONS =
  BLOCK_EDITOR_ACTION_CATALOG.map(createActionDefinition);

export const BLOCK_EDITOR_ACTION_IDS = BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => action.id);

export const BLOCK_EDITOR_ACTION_DEFINITION_BY_ID = new Map<
  BlockEditorActionId,
  BlockEditorActionDefinition
>(BLOCK_EDITOR_ACTION_DEFINITIONS.map((action) => [action.id, action]));

export function getBlockEditorActionDefinition(
  action: BlockEditorActionId,
): BlockEditorActionDefinition {
  const definition = BLOCK_EDITOR_ACTION_DEFINITION_BY_ID.get(action);
  if (!definition) {
    throw new Error(`Unknown Block Editor action: ${action}`);
  }
  return definition;
}

export function executeBlockEditorAction(
  action: BlockEditorActionId,
  context: BlockEditorActionContext,
): BlockEditorActionResult;
export function executeBlockEditorAction(
  action: string,
  context: BlockEditorActionContext,
): BlockEditorActionResult;
export function executeBlockEditorAction(
  action: string,
  context: BlockEditorActionContext,
): BlockEditorActionResult {
  const definition = BLOCK_EDITOR_ACTION_DEFINITION_BY_ID.get(action as BlockEditorActionId);
  if (!definition) {
    return { action, status: "unknown" };
  }

  return definition.execute(context);
}

export function isBlockEditorActionId(action: string): action is BlockEditorActionId {
  return BLOCK_EDITOR_ACTION_DEFINITION_BY_ID.has(action as BlockEditorActionId);
}
