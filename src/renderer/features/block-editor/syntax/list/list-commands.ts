import { commandsCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/kit/ctx";
import {
  bulletListSchema,
  liftListItemCommand,
  listItemSchema,
  orderedListSchema,
} from "@milkdown/kit/preset/commonmark";
import { wrapIn } from "@milkdown/kit/prose/commands";
import type { Node, NodeType } from "@milkdown/kit/prose/model";
import type { Command, EditorState, Selection, Transaction } from "@milkdown/kit/prose/state";
import { $command } from "@milkdown/kit/utils";

export type ListBlockFormat = "bulletList" | "orderedList" | "taskList";

export const setListBlockCommand = $command<ListBlockFormat, "SetListBlock">(
  "SetListBlock",
  (ctx) => (format) => {
    if (!format) return () => false;

    return createSetListBlockCommand(ctx, format);
  },
);

export function runSetListBlockCommand(ctx: Ctx, format: ListBlockFormat): boolean {
  return ctx.get(commandsCtx).call(setListBlockCommand.key, format);
}

interface ListSchemaTypes {
  bulletList: NodeType;
  listItem: NodeType;
  orderedList: NodeType;
}

interface ListItemRange {
  node: Node;
  position: number;
}

interface ListCommandState {
  doc: Node;
  selection: Selection;
}

function createListSchemaTypes(ctx: Ctx): ListSchemaTypes {
  return {
    bulletList: bulletListSchema.type(ctx),
    listItem: listItemSchema.type(ctx),
    orderedList: orderedListSchema.type(ctx),
  };
}

function getTargetListType(format: ListBlockFormat, types: ListSchemaTypes): NodeType {
  return format === "orderedList" ? types.orderedList : types.bulletList;
}

function isListItemInFormat(
  state: EditorState,
  item: ListItemRange,
  format: ListBlockFormat,
  types: ListSchemaTypes,
): boolean {
  const $position = state.doc.resolve(item.position);
  const expectedListType = getTargetListType(format, types);
  let isInsideExpectedList = false;

  for (let depth = $position.depth; depth > 0; depth -= 1) {
    const node = $position.node(depth);
    if (node.type !== types.bulletList && node.type !== types.orderedList) continue;

    isInsideExpectedList = node.type === expectedListType;
    break;
  }

  if (!isInsideExpectedList) return false;

  if (format === "taskList") {
    return item.node.attrs.checked !== null;
  }

  return item.node.attrs.checked === null;
}

function selectedListItemsMatchFormat(
  state: EditorState,
  format: ListBlockFormat,
  types: ListSchemaTypes,
): boolean {
  const selectedItems = findSelectionListItems(state, types);

  return (
    selectedItems.length > 0 &&
    selectedItems.every((item) => isListItemInFormat(state, item, format, types))
  );
}

function getListItemAttrs(format: ListBlockFormat, node: Node, index: number) {
  if (format === "orderedList") {
    return {
      ...node.attrs,
      checked: null,
      label: `${index + 1}.`,
      listType: "ordered",
    };
  }

  return {
    ...node.attrs,
    checked: format === "taskList" ? false : null,
    label: "•",
    listType: "bullet",
  };
}

function findSelectionListItems(state: ListCommandState, types: ListSchemaTypes): ListItemRange[] {
  const { doc, selection } = state;
  const selectedItems: ListItemRange[] = [];
  const seenPositions = new Set<number>();

  function addSelectionAncestorItems(): void {
    for (const resolvedPosition of [selection.$from, selection.$to]) {
      for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
        const node = resolvedPosition.node(depth);
        if (node.type !== types.listItem) continue;

        const position = resolvedPosition.before(depth);
        if (seenPositions.has(position)) break;

        seenPositions.add(position);
        selectedItems.push({ node, position });
        break;
      }
    }
  }

  addSelectionAncestorItems();

  doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (node.type !== types.listItem || seenPositions.has(position)) return;

    seenPositions.add(position);
    selectedItems.push({ node, position });
  });

  return [...selectedItems].sort((left, right) => left.position - right.position);
}

function setSelectedListItemAttrs(
  state: ListCommandState,
  tr: Transaction,
  format: ListBlockFormat,
  types: ListSchemaTypes,
): boolean {
  const selectedItems = findSelectionListItems(state, types);
  if (selectedItems.length === 0) return false;

  for (const [index, item] of selectedItems.entries()) {
    tr.setNodeMarkup(item.position, undefined, getListItemAttrs(format, item.node, index));
  }

  return true;
}

function convertContainingListBlocks(
  state: EditorState,
  tr: Transaction,
  format: ListBlockFormat,
  types: ListSchemaTypes,
): boolean {
  const targetListType = getTargetListType(format, types);
  let didConvert = false;

  state.doc.nodesBetween(state.selection.from, state.selection.to, (node, position) => {
    if (node.type !== types.bulletList && node.type !== types.orderedList) return;
    if (node.type === targetListType) return;

    const attrs = targetListType === types.orderedList ? { order: 1, spread: false } : node.attrs;
    tr.setNodeMarkup(position, targetListType, attrs);
    node.forEach((child, offset, index) => {
      if (child.type !== types.listItem) return;

      tr.setNodeMarkup(position + offset + 1, undefined, getListItemAttrs(format, child, index));
    });
    didConvert = true;
  });

  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type !== types.bulletList && node.type !== types.orderedList) continue;
    if (node.type === targetListType) break;

    const attrs = targetListType === types.orderedList ? { order: 1, spread: false } : node.attrs;
    const position = $from.before(depth);
    tr.setNodeMarkup(position, targetListType, attrs);
    node.forEach((child, offset, index) => {
      if (child.type !== types.listItem) return;

      tr.setNodeMarkup(position + offset + 1, undefined, getListItemAttrs(format, child, index));
    });
    didConvert = true;
    break;
  }

  return didConvert;
}

export function createSetListBlockCommand(ctx: Ctx, format: ListBlockFormat): Command {
  const types = createListSchemaTypes(ctx);

  return (state, dispatch) => {
    if (selectedListItemsMatchFormat(state, format, types)) {
      return ctx.get(commandsCtx).call(liftListItemCommand.key);
    }

    const tr = state.tr;
    const changedListType = convertContainingListBlocks(state, tr, format, types);
    const changedListItems = setSelectedListItemAttrs(state, tr, format, types);

    if (changedListType || changedListItems) {
      dispatch?.(tr.scrollIntoView());
      return true;
    }

    const targetListType = getTargetListType(format, types);
    const didWrap = wrapIn(targetListType)(state, (wrappedTransaction) => {
      const updatedTransaction = wrappedTransaction;
      setSelectedListItemAttrs(updatedTransaction, updatedTransaction, format, types);
      dispatch?.(updatedTransaction.scrollIntoView());
    });

    return didWrap;
  };
}
