import type { Node as ProseMirrorNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";

const blockEditorPlaceholderPluginKey = new PluginKey("FLUXNOTES_BLOCK_EDITOR_PLACEHOLDER");
const EMPTY_ROOT_NODE_TYPE = "paragraph";

function isEmptyRootParagraph(doc: ProseMirrorNode): boolean {
  if (doc.childCount !== 1) return false;

  const firstChild = doc.firstChild;
  return firstChild?.type.name === EMPTY_ROOT_NODE_TYPE && firstChild.content.size === 0;
}

export function createBlockEditorPlaceholderPlugin(placeholderText: string) {
  return $prose(
    () =>
      new Plugin({
        key: blockEditorPlaceholderPluginKey,
        props: {
          decorations: (state) => {
            if (!isEmptyRootParagraph(state.doc)) return null;

            const firstChild = state.doc.firstChild;
            if (!firstChild) return null;

            return DecorationSet.create(state.doc, [
              Decoration.node(0, firstChild.nodeSize, {
                class: "block-editor__placeholder",
                "data-placeholder": placeholderText,
              }),
            ]);
          },
        },
      }),
  );
}
