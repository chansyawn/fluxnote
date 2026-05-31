import type { Node as ProseMirrorNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";

const tabIndentPluginKey = new PluginKey("FLUXNOTES_TAB_INDENT");
const TAB_INDENT_TEXT = "  ";
const TABLE_NODE_NAMES = new Set(["table", "table_cell", "table_header", "table_row"]);

interface TextLineRange {
  from: number;
  to: number;
}

function isListOrTableNode(node: ProseMirrorNode): boolean {
  return node.type.name === "list_item" || TABLE_NODE_NAMES.has(node.type.name);
}

function selectionHasListOrTableAncestor(state: EditorState): boolean {
  const { selection } = state;

  for (const range of selection.ranges) {
    for (const resolvedPosition of [range.$from, range.$to]) {
      for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
        if (isListOrTableNode(resolvedPosition.node(depth))) {
          return true;
        }
      }
    }
  }

  let found = false;
  state.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (!isListOrTableNode(node)) return;

    found = true;
    return false;
  });

  return found;
}

function findTextBlockRange(state: EditorState, position: number): TextLineRange | null {
  const resolvedPosition = state.doc.resolve(position);

  for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
    const node = resolvedPosition.node(depth);
    if (!node.isTextblock) continue;

    const from = resolvedPosition.start(depth);
    return {
      from,
      to: from + node.content.size,
    };
  }

  return null;
}

function findLineRangeAtPosition(state: EditorState, position: number): TextLineRange | null {
  const textBlockRange = findTextBlockRange(state, position);
  if (!textBlockRange) return null;

  const text = state.doc.textBetween(textBlockRange.from, textBlockRange.to, "\n", "\n");
  const offset = Math.max(0, Math.min(position - textBlockRange.from, text.length));
  const lineStartOffset = text.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const nextLineBreak = text.indexOf("\n", offset);
  const lineEndOffset = nextLineBreak === -1 ? text.length : nextLineBreak;

  return {
    from: textBlockRange.from + lineStartOffset,
    to: textBlockRange.from + lineEndOffset,
  };
}

function collectSelectedLineRanges(state: EditorState): TextLineRange[] {
  const { selection } = state;
  const selectedRanges: TextLineRange[] = [];

  state.doc.nodesBetween(selection.from, selection.to, (node, position) => {
    if (!node.isTextblock) return;

    const contentFrom = position + 1;
    const contentTo = contentFrom + node.content.size;
    const selectedFrom = Math.max(selection.from, contentFrom);
    const selectedTo = Math.min(selection.to, contentTo);
    if (selectedTo < contentFrom || selectedFrom > contentTo) return;

    const text = state.doc.textBetween(contentFrom, contentTo, "\n", "\n");
    let lineStartOffset = 0;

    for (const line of text.split("\n")) {
      const lineFrom = contentFrom + lineStartOffset;
      const lineTo = lineFrom + line.length;
      const intersectsSelection = selectedFrom <= lineTo && selectedTo >= lineFrom;

      if (intersectsSelection) {
        selectedRanges.push({ from: lineFrom, to: lineTo });
      }

      lineStartOffset += line.length + 1;
    }
  });

  return selectedRanges;
}

function getLineRanges(state: EditorState): TextLineRange[] {
  const { selection } = state;
  if (!selection.empty) {
    return collectSelectedLineRanges(state);
  }

  const lineRange = findLineRangeAtPosition(state, selection.from);
  return lineRange ? [lineRange] : [];
}

function indentSelection(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
): boolean {
  const lineRanges = getLineRanges(state);
  if (lineRanges.length === 0) return false;

  const tr = state.tr;
  for (const lineRange of [...lineRanges].reverse()) {
    tr.insertText(TAB_INDENT_TEXT, lineRange.from, lineRange.from);
  }
  tr.setSelection(state.selection.map(tr.doc, tr.mapping));

  dispatch?.(tr);
  return true;
}

function outdentSelection(
  state: EditorState,
  dispatch: ((tr: Transaction) => void) | undefined,
): boolean {
  const lineRanges = getLineRanges(state);
  if (lineRanges.length === 0) return false;

  const tr = state.tr;
  for (const lineRange of [...lineRanges].reverse()) {
    const linePrefix = state.doc.textBetween(
      lineRange.from,
      Math.min(lineRange.from + TAB_INDENT_TEXT.length, lineRange.to),
      "\n",
      "\n",
    );
    const removableSpaces = Math.min(
      TAB_INDENT_TEXT.length,
      linePrefix.match(/^ */)?.[0].length ?? 0,
    );

    if (removableSpaces > 0) {
      tr.delete(lineRange.from, lineRange.from + removableSpaces);
    }
  }

  if (!tr.docChanged) return true;

  tr.setSelection(state.selection.map(tr.doc, tr.mapping));
  dispatch?.(tr);
  return true;
}

export const tabIndentPlugin = $prose(
  () =>
    new Plugin({
      key: tabIndentPluginKey,
      props: {
        handleKeyDown(view, event) {
          if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) {
            return false;
          }

          if (selectionHasListOrTableAncestor(view.state)) {
            return false;
          }

          const handled = event.shiftKey
            ? outdentSelection(view.state, view.dispatch)
            : indentSelection(view.state, view.dispatch);
          if (!handled) return false;

          event.preventDefault();
          return true;
        },
      },
    }),
);
