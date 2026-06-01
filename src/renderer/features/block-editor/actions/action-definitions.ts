import { FORMAT_TEXT_COMMAND, type TextFormatType } from "lexical";
import {
  BoldIcon,
  BracesIcon,
  CheckSquareIcon,
  Code2Icon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  Heading5Icon,
  Heading6Icon,
  ItalicIcon,
  ListIcon,
  ListOrderedIcon,
  PilcrowIcon,
  QuoteIcon,
  StrikethroughIcon,
} from "lucide-react";

import { applyBlockFormat, isBlockFormattingDisabledAtSelection } from "../core/block-format";
import type { BlockEditorBlockFormat, BlockEditorInlineFormat } from "../toolbar/types";
import type {
  BlockEditorActionContext,
  BlockEditorActionDefinition,
  BlockEditorActionGroup,
  BlockEditorActionId,
  BlockEditorActionResult,
} from "./types";

const BLOCK_ACTIONS = [
  {
    format: "paragraph",
    group: "text-style",
    icon: PilcrowIcon,
    id: "editor.paragraph",
    label: { id: "block-editor.toolbar.normal-text", message: "Normal text" },
  },
  {
    format: "heading1",
    group: "text-style",
    icon: Heading1Icon,
    id: "editor.heading1",
    label: { id: "block-editor.toolbar.heading-1", message: "Heading 1" },
  },
  {
    format: "heading2",
    group: "text-style",
    icon: Heading2Icon,
    id: "editor.heading2",
    label: { id: "block-editor.toolbar.heading-2", message: "Heading 2" },
  },
  {
    format: "heading3",
    group: "text-style",
    icon: Heading3Icon,
    id: "editor.heading3",
    label: { id: "block-editor.toolbar.heading-3", message: "Heading 3" },
  },
  {
    format: "heading4",
    group: "text-style",
    icon: Heading4Icon,
    id: "editor.heading4",
    label: { id: "block-editor.toolbar.heading-4", message: "Heading 4" },
  },
  {
    format: "heading5",
    group: "text-style",
    icon: Heading5Icon,
    id: "editor.heading5",
    label: { id: "block-editor.toolbar.heading-5", message: "Heading 5" },
  },
  {
    format: "heading6",
    group: "text-style",
    icon: Heading6Icon,
    id: "editor.heading6",
    label: { id: "block-editor.toolbar.heading-6", message: "Heading 6" },
  },
  {
    format: "bulletList",
    group: "list",
    icon: ListIcon,
    id: "editor.bulletList",
    label: { id: "block-editor.toolbar.bullet-list", message: "Bullet list" },
  },
  {
    format: "orderedList",
    group: "list",
    icon: ListOrderedIcon,
    id: "editor.orderedList",
    label: { id: "block-editor.toolbar.numbered-list", message: "Numbered list" },
  },
  {
    format: "taskList",
    group: "list",
    icon: CheckSquareIcon,
    id: "editor.taskList",
    label: { id: "block-editor.toolbar.task-list", message: "Task list" },
  },
  {
    format: "blockquote",
    group: "block-button",
    icon: QuoteIcon,
    id: "editor.blockquote",
    label: { id: "block-editor.toolbar.blockquote", message: "Quote" },
  },
  {
    format: "codeBlock",
    group: "block-button",
    icon: BracesIcon,
    id: "editor.codeBlock",
    label: { id: "block-editor.toolbar.code-block", message: "Code block" },
  },
] as const satisfies readonly {
  format: BlockEditorBlockFormat;
  group: BlockEditorActionGroup;
  icon: BlockEditorActionDefinition["icon"];
  id: BlockEditorActionId;
  label: BlockEditorActionDefinition["label"];
}[];

const INLINE_ACTIONS = [
  {
    format: "bold",
    icon: BoldIcon,
    id: "editor.bold",
    label: { id: "block-editor.toolbar.bold", message: "Bold" },
    lexicalFormat: "bold",
  },
  {
    format: "italic",
    icon: ItalicIcon,
    id: "editor.italic",
    label: { id: "block-editor.toolbar.italic", message: "Italic" },
    lexicalFormat: "italic",
  },
  {
    format: "strikethrough",
    icon: StrikethroughIcon,
    id: "editor.strikethrough",
    label: { id: "block-editor.toolbar.strikethrough", message: "Strikethrough" },
    lexicalFormat: "strikethrough",
  },
  {
    format: "inlineCode",
    icon: Code2Icon,
    id: "editor.inlineCode",
    label: { id: "block-editor.toolbar.inline-code", message: "Inline code" },
    lexicalFormat: "code",
  },
] as const satisfies readonly {
  format: BlockEditorInlineFormat;
  icon: BlockEditorActionDefinition["icon"];
  id: BlockEditorActionId;
  label: BlockEditorActionDefinition["label"];
  lexicalFormat: TextFormatType;
}[];

function disabledActionResult(action: BlockEditorActionId): BlockEditorActionResult {
  return { action, status: "disabled" };
}

function executedActionResult(action: BlockEditorActionId): BlockEditorActionResult {
  return { action, status: "executed" };
}

function createBlockActionDefinition(
  action: (typeof BLOCK_ACTIONS)[number],
): BlockEditorActionDefinition<BlockEditorBlockFormat> {
  return {
    ...action,
    isDisabled: () => isBlockFormattingDisabledAtSelection(),
    kind: "block-format",
    execute: ({ editor }) => {
      const disabled = editor.getEditorState().read(() => isBlockFormattingDisabledAtSelection());
      if (disabled) {
        return disabledActionResult(action.id);
      }

      editor.update(() => {
        applyBlockFormat(action.format);
      });
      return executedActionResult(action.id);
    },
  };
}

function createInlineActionDefinition(
  action: (typeof INLINE_ACTIONS)[number],
): BlockEditorActionDefinition<BlockEditorInlineFormat> {
  return {
    format: action.format,
    group: "inline",
    icon: action.icon,
    id: action.id,
    isDisabled: () => false,
    kind: "inline-format",
    label: action.label,
    execute: ({ editor }) => {
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, action.lexicalFormat);
      return executedActionResult(action.id);
    },
  };
}

export const BLOCK_EDITOR_ACTION_DEFINITIONS = [
  ...BLOCK_ACTIONS.map(createBlockActionDefinition),
  ...INLINE_ACTIONS.map(createInlineActionDefinition),
] as const;

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
