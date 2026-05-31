import { Plugin, PluginKey, TextSelection } from "@milkdown/kit/prose/state";
import { $prose } from "@milkdown/kit/utils";

const codeBlockBackspacePluginKey = new PluginKey("FLUXNOTES_CODE_BLOCK_BACKSPACE");

function hasBackspaceModifier(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function isSingleLineText(text: string): boolean {
  return !text.includes("\n");
}

export const codeBlockBackspacePlugin = $prose(
  () =>
    new Plugin({
      key: codeBlockBackspacePluginKey,
      props: {
        handleKeyDown(view, event) {
          if (event.key !== "Backspace" || hasBackspaceModifier(event)) return false;

          const { schema, selection } = view.state;
          if (!selection.empty || !(selection instanceof TextSelection)) return false;

          const { $cursor } = selection;
          if (!$cursor || !$cursor.parent.type.spec.code || $cursor.parentOffset !== 0) {
            return false;
          }

          const paragraph = schema.nodes.paragraph;
          if (!paragraph || !isSingleLineText($cursor.parent.textContent)) return false;

          const codeBlockStart = $cursor.before();
          const tr = view.state.tr.replaceWith(
            codeBlockStart,
            $cursor.after(),
            paragraph.createChecked({}, $cursor.parent.content),
          );
          tr.setSelection(TextSelection.near(tr.doc.resolve(codeBlockStart)));

          view.dispatch(tr.scrollIntoView());
          event.preventDefault();
          return true;
        },
      },
    }),
);
