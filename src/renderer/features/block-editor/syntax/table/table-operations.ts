import { commandsCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import {
  addColAfterCommand,
  addColBeforeCommand,
  addRowAfterCommand,
  addRowBeforeCommand,
  deleteSelectedCellsCommand,
  moveColCommand,
  moveRowCommand,
  selectColCommand,
  selectRowCommand,
  setAlignCommand,
} from "@milkdown/kit/preset/gfm";
import { Selection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";

import type { TableColumnAlign, TableControlTarget } from "./table-controls-state";

export type TableStructureOperation =
  | "insert-column-left"
  | "insert-column-right"
  | "move-column-left"
  | "move-column-right"
  | "delete-column"
  | "insert-row-above"
  | "insert-row-below"
  | "move-row-up"
  | "move-row-down"
  | "delete-row";

export interface SetTableColumnAlignOperation {
  align: TableColumnAlign;
  operation: "set-column-align";
}

export type TableOperationAction = SetTableColumnAlignOperation | TableStructureOperation;

function focusCell(view: EditorView, cellPos: number): void {
  const selection = Selection.near(view.state.doc.resolve(cellPos + 1));
  view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
  view.focus();
}

function selectColumn(ctx: Ctx, target: TableControlTarget): void {
  ctx.get(commandsCtx).call(selectColCommand.key, {
    index: target.columnIndex,
    pos: target.cellPos,
  });
}

function selectRow(ctx: Ctx, target: TableControlTarget): void {
  ctx.get(commandsCtx).call(selectRowCommand.key, {
    index: target.rowIndex,
    pos: target.cellPos,
  });
}

export function performTableOperation(
  ctx: Ctx,
  view: EditorView,
  target: TableControlTarget,
  action: TableOperationAction,
): void {
  const commands = ctx.get(commandsCtx);
  focusCell(view, target.cellPos);

  if (typeof action !== "string") {
    selectColumn(ctx, target);
    commands.call(setAlignCommand.key, action.align);
    focusCell(view, target.cellPos);
    return;
  }

  switch (action) {
    case "insert-column-left":
      commands.call(addColBeforeCommand.key);
      break;
    case "insert-column-right":
      commands.call(addColAfterCommand.key);
      break;
    case "move-column-left":
      commands.call(moveColCommand.key, {
        from: target.columnIndex,
        pos: target.cellPos,
        to: target.columnIndex - 1,
      });
      break;
    case "move-column-right":
      commands.call(moveColCommand.key, {
        from: target.columnIndex,
        pos: target.cellPos,
        to: target.columnIndex + 1,
      });
      break;
    case "delete-column":
      selectColumn(ctx, target);
      commands.call(deleteSelectedCellsCommand.key);
      break;
    case "insert-row-above":
      commands.call(addRowBeforeCommand.key);
      break;
    case "insert-row-below":
      commands.call(addRowAfterCommand.key);
      break;
    case "move-row-up":
      commands.call(moveRowCommand.key, {
        from: target.rowIndex,
        pos: target.cellPos,
        to: target.rowIndex - 1,
      });
      break;
    case "move-row-down":
      commands.call(moveRowCommand.key, {
        from: target.rowIndex,
        pos: target.cellPos,
        to: target.rowIndex + 1,
      });
      break;
    case "delete-row":
      selectRow(ctx, target);
      commands.call(deleteSelectedCellsCommand.key);
      break;
  }
}
