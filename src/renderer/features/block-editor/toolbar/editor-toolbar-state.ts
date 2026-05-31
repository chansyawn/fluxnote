import type { Editor } from "@milkdown/kit/core";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import {
  blockquoteSchema,
  bulletListSchema,
  codeBlockSchema,
  emphasisSchema,
  headingSchema,
  inlineCodeSchema,
  linkSchema,
  orderedListSchema,
  paragraphSchema,
  setBlockTypeCommand,
  strongSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockTypeCommand,
} from "@milkdown/kit/preset/commonmark";
import { strikethroughSchema, toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import { lift } from "@milkdown/kit/prose/commands";
import type { MarkType, NodeType, ResolvedPos } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

import { runLinkToolbarCommand, type LinkToolbarCommandResult } from "../syntax/link/link-model";
import { runSetListBlockCommand } from "../syntax/list";
import {
  BLOCK_EDITOR_BLOCK_FORMATS,
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorBlockFormat,
  type BlockEditorToolbarCommand,
  type BlockEditorToolbarState,
  type BlockEditorToolbarStateListener,
} from "./types";

function readMarkState(view: EditorView, markType: MarkType): boolean {
  const { doc, selection, storedMarks } = view.state;
  const { empty, from, to, $from } = selection;

  if (empty) {
    return (
      Boolean(storedMarks?.some((mark) => mark.type === markType)) ||
      markType.isInSet($from.marks()) !== undefined
    );
  }

  return doc.rangeHasMark(from, to, markType);
}

function isNodeActive(view: EditorView, nodeType: NodeType): boolean {
  const { $from } = view.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === nodeType) {
      return true;
    }
  }

  return false;
}

function isTaskListItemActive(view: EditorView): boolean {
  const { $from } = view.state.selection;

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === "list_item" && node.attrs.checked !== null) {
      return true;
    }
  }

  return false;
}

function isListItemNodeForFormat(format: BlockEditorBlockFormat, nodeTypeName: string): boolean {
  return format === "bulletList" || format === "orderedList" || format === "taskList"
    ? nodeTypeName === "list_item"
    : false;
}

function readBlockFormat(view: EditorView, nodeTypes: Record<BlockEditorBlockFormat, NodeType>) {
  const { $from } = view.state.selection;
  const parent = $from.parent;

  if (parent.type === nodeTypes.codeBlock) {
    return "codeBlock";
  }

  if (parent.type === nodeTypes.heading1) {
    const level = parent.attrs.level as number;
    if (level >= 1 && level <= 6) {
      return `heading${level}` as BlockEditorBlockFormat;
    }
  }

  return "paragraph";
}

function selectionTextBlockMatches(
  view: EditorView,
  format: BlockEditorBlockFormat,
  nodeTypes: Record<BlockEditorBlockFormat, NodeType>,
): boolean {
  const { doc, selection } = view.state;
  let hasTextBlock = false;
  let allMatch = true;

  doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (!node.isTextblock) return;
    if (position === selection.to) return;

    hasTextBlock = true;
    if (!textBlockMatches(view, format, nodeTypes, position)) {
      allMatch = false;
      return false;
    }

    return undefined;
  });

  if (!hasTextBlock) {
    const { $from } = selection;
    return textBlockMatches(view, format, nodeTypes, $from.before($from.depth));
  }

  return allMatch;
}

function textBlockMatches(
  view: EditorView,
  format: BlockEditorBlockFormat,
  nodeTypes: Record<BlockEditorBlockFormat, NodeType>,
  position: number,
): boolean {
  const $position = view.state.doc.resolve(position);
  const node = $position.nodeAfter;

  if (!node?.isTextblock) return false;

  if (format === "paragraph") {
    return node.type === nodeTypes.paragraph;
  }

  if (format === "codeBlock") {
    return node.type === nodeTypes.codeBlock;
  }

  if (format.startsWith("heading")) {
    return (
      node.type === nodeTypes.heading1 && node.attrs.level === Number(format.replace("heading", ""))
    );
  }

  for (let depth = $position.depth; depth > 0; depth -= 1) {
    const ancestor = $position.node(depth);

    if (format === "blockquote" && ancestor.type === nodeTypes.blockquote) {
      return true;
    }

    if (format === "orderedList" && ancestor.type === nodeTypes.orderedList) {
      return true;
    }

    if (
      (format === "bulletList" || format === "taskList") &&
      ancestor.type === nodeTypes.bulletList
    ) {
      return hasListItemFormat($position, format);
    }

    if (isListItemNodeForFormat(format, ancestor.type.name)) {
      continue;
    }
  }

  return false;
}

function hasListItemFormat(
  $position: ResolvedPos,
  format: Extract<BlockEditorBlockFormat, "bulletList" | "taskList">,
): boolean {
  for (let depth = $position.depth; depth > 0; depth -= 1) {
    const node = $position.node(depth);
    if (node.type.name !== "list_item") continue;

    return format === "taskList" ? node.attrs.checked !== null : node.attrs.checked === null;
  }

  return format === "bulletList";
}

function createEmptyActiveBlocks(): Record<BlockEditorBlockFormat, boolean> {
  return Object.fromEntries(BLOCK_EDITOR_BLOCK_FORMATS.map((format) => [format, false])) as Record<
    BlockEditorBlockFormat,
    boolean
  >;
}

export function areToolbarStatesEqual(
  left: BlockEditorToolbarState,
  right: BlockEditorToolbarState,
): boolean {
  return (
    left.blockFormat === right.blockFormat &&
    left.inlineFormats.bold === right.inlineFormats.bold &&
    left.inlineFormats.inlineCode === right.inlineFormats.inlineCode &&
    left.inlineFormats.italic === right.inlineFormats.italic &&
    left.inlineFormats.link === right.inlineFormats.link &&
    left.inlineFormats.strikethrough === right.inlineFormats.strikethrough &&
    BLOCK_EDITOR_BLOCK_FORMATS.every(
      (format) => left.activeBlocks[format] === right.activeBlocks[format],
    )
  );
}

export function readToolbarState(editor: Editor): BlockEditorToolbarState {
  return editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const headingType = headingSchema.type(ctx);
    const nodeTypes = {
      blockquote: blockquoteSchema.type(ctx),
      bulletList: bulletListSchema.type(ctx),
      codeBlock: codeBlockSchema.type(ctx),
      heading1: headingType,
      heading2: headingType,
      heading3: headingType,
      heading4: headingType,
      heading5: headingType,
      heading6: headingType,
      orderedList: orderedListSchema.type(ctx),
      paragraph: paragraphSchema.type(ctx),
      taskList: bulletListSchema.type(ctx),
    } satisfies Record<BlockEditorBlockFormat, NodeType>;
    const blockFormat = readBlockFormat(view, nodeTypes);
    const activeBlocks = createEmptyActiveBlocks();
    activeBlocks[blockFormat] = true;
    activeBlocks.blockquote = isNodeActive(view, nodeTypes.blockquote);
    activeBlocks.bulletList = isNodeActive(view, nodeTypes.bulletList);
    activeBlocks.orderedList = isNodeActive(view, nodeTypes.orderedList);
    activeBlocks.taskList = activeBlocks.bulletList && isTaskListItemActive(view);
    activeBlocks.bulletList = activeBlocks.bulletList && !activeBlocks.taskList;

    return {
      activeBlocks,
      blockFormat,
      inlineFormats: {
        bold: readMarkState(view, strongSchema.type(ctx)),
        inlineCode: readMarkState(view, inlineCodeSchema.type(ctx)),
        italic: readMarkState(view, emphasisSchema.type(ctx)),
        link: readMarkState(view, linkSchema.type(ctx)),
        strikethrough: readMarkState(view, strikethroughSchema.type(ctx)),
      },
    };
  });
}

function toggleInlineCodeInContext(ctx: Ctx): void {
  const view = ctx.get(editorViewCtx);
  const { state } = view;

  if (state.selection.empty && state.selection instanceof TextSelection) {
    const markType = inlineCodeSchema.type(ctx);
    const hasMark = readMarkState(view, markType);
    const transaction = hasMark
      ? state.tr.removeStoredMark(markType)
      : state.tr.addStoredMark(markType.create());
    view.dispatch(transaction);
    return;
  }

  ctx.get(commandsCtx).call(toggleInlineCodeCommand.key);
}

function createNodeTypes(ctx: Ctx): Record<BlockEditorBlockFormat, NodeType> {
  const headingType = headingSchema.type(ctx);

  return {
    blockquote: blockquoteSchema.type(ctx),
    bulletList: bulletListSchema.type(ctx),
    codeBlock: codeBlockSchema.type(ctx),
    heading1: headingType,
    heading2: headingType,
    heading3: headingType,
    heading4: headingType,
    heading5: headingType,
    heading6: headingType,
    orderedList: orderedListSchema.type(ctx),
    paragraph: paragraphSchema.type(ctx),
    taskList: bulletListSchema.type(ctx),
  };
}

function runBlockCommand(ctx: Ctx, format: BlockEditorBlockFormat): void {
  const commands = ctx.get(commandsCtx);
  const view = ctx.get(editorViewCtx);
  const nodeTypes = createNodeTypes(ctx);
  const isActiveAcrossSelection = selectionTextBlockMatches(view, format, nodeTypes);

  if (format === "paragraph") {
    commands.call(setBlockTypeCommand.key, { nodeType: paragraphSchema.type(ctx) });
    return;
  }

  if (format.startsWith("heading")) {
    if (isActiveAcrossSelection) {
      commands.call(setBlockTypeCommand.key, { nodeType: paragraphSchema.type(ctx) });
      return;
    }

    commands.call(setBlockTypeCommand.key, {
      attrs: { level: Number(format.replace("heading", "")) },
      nodeType: headingSchema.type(ctx),
    });
    return;
  }

  if (format === "codeBlock") {
    commands.call(setBlockTypeCommand.key, {
      nodeType: isActiveAcrossSelection ? paragraphSchema.type(ctx) : codeBlockSchema.type(ctx),
    });
    return;
  }

  if (format === "blockquote") {
    if (isActiveAcrossSelection) {
      lift(view.state, view.dispatch);
      return;
    }

    commands.call(wrapInBlockTypeCommand.key, { nodeType: blockquoteSchema.type(ctx) });
    return;
  }

  switch (format) {
    case "bulletList":
      runSetListBlockCommand(ctx, "bulletList");
      break;
    case "orderedList":
      runSetListBlockCommand(ctx, "orderedList");
      break;
    case "taskList":
      runSetListBlockCommand(ctx, "taskList");
      break;
  }
}

export function runToolbarCommandWithContext(
  ctx: Ctx,
  command: BlockEditorToolbarCommand,
): LinkToolbarCommandResult | null {
  if (command.type === "toggle-inline" && command.format === "inlineCode") {
    toggleInlineCodeInContext(ctx);
    return null;
  }

  if (command.type === "toggle-inline" && command.format === "link") {
    const view = ctx.get(editorViewCtx);
    return runLinkToolbarCommand(view, linkSchema.type(ctx));
  }

  const commands = ctx.get(commandsCtx);
  if (command.type === "toggle-inline") {
    switch (command.format) {
      case "bold":
        commands.call(toggleStrongCommand.key);
        break;
      case "italic":
        commands.call(toggleEmphasisCommand.key);
        break;
      case "strikethrough":
        commands.call(toggleStrikethroughCommand.key);
        break;
      case "inlineCode":
      case "link":
        break;
    }
    return null;
  }

  runBlockCommand(ctx, command.format);
  return null;
}

export function runToolbarCommand(
  editor: Editor,
  command: BlockEditorToolbarCommand,
): LinkToolbarCommandResult | null {
  return editor.action((ctx) => runToolbarCommandWithContext(ctx, command));
}

export class BlockEditorToolbarStateStore {
  private state = DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE;

  private readonly listeners = new Set<BlockEditorToolbarStateListener>();

  getSnapshot = (): BlockEditorToolbarState => this.state;

  publish = (nextState: BlockEditorToolbarState): void => {
    if (areToolbarStatesEqual(this.state, nextState)) {
      return;
    }

    this.state = nextState;
    for (const listener of this.listeners) {
      listener(nextState);
    }
  };

  subscribe = (listener: BlockEditorToolbarStateListener): (() => void) => {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  };
}
