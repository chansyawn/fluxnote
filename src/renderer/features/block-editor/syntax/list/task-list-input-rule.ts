import { bulletListSchema } from "@milkdown/kit/preset/commonmark";
import { InputRule } from "@milkdown/kit/prose/inputrules";
import type { Transaction } from "@milkdown/kit/prose/state";
import { findWrapping } from "@milkdown/kit/prose/transform";
import { $inputRule } from "@milkdown/kit/utils";

function readTaskCheckedState(match: RegExpMatchArray): boolean {
  return match.groups?.checked === "x";
}

function setContainingListItemChecked(tr: Transaction, start: number, checked: boolean) {
  const position = tr.doc.resolve(start);

  for (let depth = position.depth; depth > 0; depth -= 1) {
    const node = position.node(depth);
    if (node.type.name !== "list_item") continue;

    return tr.setNodeMarkup(position.before(depth), undefined, {
      ...node.attrs,
      checked,
    });
  }

  let listItemPosition: number | undefined;
  tr.doc.descendants((node, nodePosition) => {
    if (
      node.type.name === "list_item" &&
      nodePosition <= start &&
      start <= nodePosition + node.nodeSize
    ) {
      listItemPosition = nodePosition;
      return false;
    }

    return true;
  });

  if (listItemPosition !== undefined) {
    const node = tr.doc.nodeAt(listItemPosition);
    if (node) {
      return tr.setNodeMarkup(listItemPosition, undefined, {
        ...node.attrs,
        checked,
      });
    }
  }

  return null;
}

export const wrapEmptyBracketsInTaskListInputRule = $inputRule(
  (ctx) =>
    new InputRule(/^\[(?<checked>\s|x)?\]\s$/, (state, match, start, end) => {
      const checked = readTaskCheckedState(match);
      const position = state.doc.resolve(start);

      for (let depth = position.depth; depth > 0; depth -= 1) {
        const node = position.node(depth);
        if (node.type.name !== "list_item") continue;
        if (node.attrs.checked !== null) return null;

        return state.tr.deleteRange(start, end).setNodeMarkup(position.before(depth), undefined, {
          ...node.attrs,
          checked,
        });
      }

      const tr = state.tr.delete(start, end);
      const range = tr.doc.resolve(start).blockRange();
      const wrapping = range && findWrapping(range, bulletListSchema.type(ctx));
      if (!wrapping) return null;

      tr.wrap(range, wrapping);
      return setContainingListItemChecked(tr, start, checked);
    }),
);
