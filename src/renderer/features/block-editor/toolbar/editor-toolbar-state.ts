import type { Editor } from "@milkdown/kit/core";
import { commandsCtx, editorViewCtx } from "@milkdown/kit/core";
import {
  emphasisSchema,
  inlineCodeSchema,
  strongSchema,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
} from "@milkdown/kit/preset/commonmark";
import { strikethroughSchema, toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import type { MarkType } from "@milkdown/kit/prose/model";
import type { EditorView } from "@milkdown/kit/prose/view";

import {
  DEFAULT_BLOCK_EDITOR_TOOLBAR_STATE,
  type BlockEditorTextFormat,
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

export function areToolbarStatesEqual(
  left: BlockEditorToolbarState,
  right: BlockEditorToolbarState,
): boolean {
  return (
    left.textFormats.bold === right.textFormats.bold &&
    left.textFormats.code === right.textFormats.code &&
    left.textFormats.italic === right.textFormats.italic &&
    left.textFormats.strikethrough === right.textFormats.strikethrough
  );
}

export function readToolbarState(editor: Editor): BlockEditorToolbarState {
  return editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);

    return {
      textFormats: {
        bold: readMarkState(view, strongSchema.type(ctx)),
        code: readMarkState(view, inlineCodeSchema.type(ctx)),
        italic: readMarkState(view, emphasisSchema.type(ctx)),
        strikethrough: readMarkState(view, strikethroughSchema.type(ctx)),
      },
    };
  });
}

export function runFormatCommand(editor: Editor, format: BlockEditorTextFormat): void {
  editor.action((ctx) => {
    const commands = ctx.get(commandsCtx);
    const command = {
      bold: toggleStrongCommand.key,
      code: toggleInlineCodeCommand.key,
      italic: toggleEmphasisCommand.key,
      strikethrough: toggleStrikethroughCommand.key,
    }[format];

    commands.call(command);
  });
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
