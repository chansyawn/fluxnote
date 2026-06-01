import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  type TextFormatType,
} from "lexical";
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

import {
  isBlockFormattingDisabledAtSelection,
  isListFormatActiveAtSelection,
  isQuoteActiveAtSelection,
  isTextStyleActiveAtSelection,
  toggleListFormatAtSelection,
  toggleQuoteAtSelection,
  toggleTextStyleAtSelection,
  type BlockEditorListFormat,
  type BlockEditorTextStyleFormat,
} from "../core/block-format";
import type { BlockEditorInlineFormat } from "../toolbar/types";
import type {
  BlockEditorActionContext,
  BlockEditorActionDefinition,
  BlockEditorActionId,
  BlockEditorActionResult,
} from "./types";

const TEXT_STYLE_ACTIONS = [
  {
    format: "paragraph",
    icon: PilcrowIcon,
    id: "editor.paragraph",
    label: { id: "block-editor.toolbar.normal-text", message: "Normal text" },
  },
  {
    format: "heading1",
    icon: Heading1Icon,
    id: "editor.heading1",
    label: { id: "block-editor.toolbar.heading-1", message: "Heading 1" },
  },
  {
    format: "heading2",
    icon: Heading2Icon,
    id: "editor.heading2",
    label: { id: "block-editor.toolbar.heading-2", message: "Heading 2" },
  },
  {
    format: "heading3",
    icon: Heading3Icon,
    id: "editor.heading3",
    label: { id: "block-editor.toolbar.heading-3", message: "Heading 3" },
  },
  {
    format: "heading4",
    icon: Heading4Icon,
    id: "editor.heading4",
    label: { id: "block-editor.toolbar.heading-4", message: "Heading 4" },
  },
  {
    format: "heading5",
    icon: Heading5Icon,
    id: "editor.heading5",
    label: { id: "block-editor.toolbar.heading-5", message: "Heading 5" },
  },
  {
    format: "heading6",
    icon: Heading6Icon,
    id: "editor.heading6",
    label: { id: "block-editor.toolbar.heading-6", message: "Heading 6" },
  },
  {
    format: "codeBlock",
    icon: BracesIcon,
    id: "editor.codeBlock",
    label: { id: "block-editor.toolbar.code-block", message: "Code block" },
  },
] as const satisfies readonly {
  format: BlockEditorTextStyleFormat;
  icon: BlockEditorActionDefinition["icon"];
  id: BlockEditorActionId;
  label: BlockEditorActionDefinition["label"];
}[];

const LIST_ACTIONS = [
  {
    format: "bulletList",
    icon: ListIcon,
    id: "editor.bulletList",
    label: { id: "block-editor.toolbar.bullet-list", message: "Bullet list" },
  },
  {
    format: "orderedList",
    icon: ListOrderedIcon,
    id: "editor.orderedList",
    label: { id: "block-editor.toolbar.numbered-list", message: "Numbered list" },
  },
  {
    format: "taskList",
    icon: CheckSquareIcon,
    id: "editor.taskList",
    label: { id: "block-editor.toolbar.task-list", message: "Task list" },
  },
] as const satisfies readonly {
  format: BlockEditorListFormat;
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

const QUOTE_ACTION = {
  icon: QuoteIcon,
  id: "editor.blockquote",
  label: { id: "block-editor.toolbar.blockquote", message: "Quote" },
} as const satisfies {
  icon: BlockEditorActionDefinition["icon"];
  id: BlockEditorActionId;
  label: BlockEditorActionDefinition["label"];
};

function disabledActionResult(action: BlockEditorActionId): BlockEditorActionResult {
  return { action, status: "disabled" };
}

function executedActionResult(action: BlockEditorActionId): BlockEditorActionResult {
  return { action, status: "executed" };
}

function createBlockActionDefinition(
  action: Omit<BlockEditorActionDefinition, "execute" | "isDisabled">,
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

function createTextStyleActionDefinition(
  action: (typeof TEXT_STYLE_ACTIONS)[number],
): BlockEditorActionDefinition {
  return createBlockActionDefinition(
    {
      icon: action.icon,
      id: action.id,
      isActive: () => isTextStyleActiveAtSelection(action.format),
      label: action.label,
    },
    () => {
      toggleTextStyleAtSelection(action.format);
    },
  );
}

function createListActionDefinition(
  action: (typeof LIST_ACTIONS)[number],
): BlockEditorActionDefinition {
  return createBlockActionDefinition(
    {
      icon: action.icon,
      id: action.id,
      isActive: () => isListFormatActiveAtSelection(action.format),
      label: action.label,
    },
    () => {
      toggleListFormatAtSelection(action.format);
    },
  );
}

function createQuoteActionDefinition(): BlockEditorActionDefinition {
  return createBlockActionDefinition(
    {
      icon: QUOTE_ACTION.icon,
      id: QUOTE_ACTION.id,
      isActive: () => isQuoteActiveAtSelection(),
      label: QUOTE_ACTION.label,
    },
    toggleQuoteAtSelection,
  );
}

function createInlineActionDefinition(
  action: (typeof INLINE_ACTIONS)[number],
): BlockEditorActionDefinition {
  return {
    icon: action.icon,
    id: action.id,
    isActive: () => {
      const selection = $getSelection();
      return $isRangeSelection(selection) && selection.hasFormat(action.lexicalFormat);
    },
    isDisabled: () => false,
    label: action.label,
    execute: ({ editor }) => {
      editor.update(
        () => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, action.lexicalFormat);
        },
        { discrete: true },
      );
      return executedActionResult(action.id);
    },
  };
}

export const BLOCK_EDITOR_ACTION_DEFINITIONS = [
  ...TEXT_STYLE_ACTIONS.map(createTextStyleActionDefinition),
  ...LIST_ACTIONS.map(createListActionDefinition),
  createQuoteActionDefinition(),
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
