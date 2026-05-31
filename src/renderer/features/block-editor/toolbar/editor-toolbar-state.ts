import type { Editor } from "@milkdown/kit/core";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
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
import type { MarkType, NodeType } from "@milkdown/kit/prose/model";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

import { runLinkToolbarCommand, type LinkToolbarCommandResult } from "../syntax/link/link-model";
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
    } satisfies Record<BlockEditorBlockFormat, NodeType>;
    const blockFormat = readBlockFormat(view, nodeTypes);
    const activeBlocks = createEmptyActiveBlocks();
    activeBlocks[blockFormat] = true;
    activeBlocks.blockquote = isNodeActive(view, nodeTypes.blockquote);
    activeBlocks.bulletList = isNodeActive(view, nodeTypes.bulletList);
    activeBlocks.orderedList = isNodeActive(view, nodeTypes.orderedList);

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

function toggleInlineCode(editor: Editor): void {
  editor.action((ctx) => {
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
  });
}

export function runToolbarCommand(
  editor: Editor,
  command: BlockEditorToolbarCommand,
): LinkToolbarCommandResult | null {
  if (command.type === "toggle-inline" && command.format === "inlineCode") {
    toggleInlineCode(editor);
    return null;
  }

  if (command.type === "toggle-inline" && command.format === "link") {
    return editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      return runLinkToolbarCommand(view, linkSchema.type(ctx));
    });
  }

  editor.action((ctx) => {
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
          commands.call(toggleInlineCodeCommand.key);
          break;
        case "link":
          break;
      }
      return;
    }

    const format = command.format;
    if (format === "paragraph") {
      commands.call(setBlockTypeCommand.key, { nodeType: paragraphSchema.type(ctx) });
      return;
    }

    if (format.startsWith("heading")) {
      commands.call(setBlockTypeCommand.key, {
        attrs: { level: Number(format.replace("heading", "")) },
        nodeType: headingSchema.type(ctx),
      });
      return;
    }

    if (format === "codeBlock") {
      commands.call(setBlockTypeCommand.key, { nodeType: codeBlockSchema.type(ctx) });
      return;
    }

    switch (format) {
      case "blockquote":
        commands.call(wrapInBlockTypeCommand.key, { nodeType: blockquoteSchema.type(ctx) });
        break;
      case "bulletList":
        commands.call(wrapInBlockTypeCommand.key, { nodeType: bulletListSchema.type(ctx) });
        break;
      case "orderedList":
        commands.call(wrapInBlockTypeCommand.key, { nodeType: orderedListSchema.type(ctx) });
        break;
    }
  });
  return null;
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
