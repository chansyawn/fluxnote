import { $isAutoLinkNode, $isLinkNode, AutoLinkNode, LinkNode } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import { $getNodeByKey, type LexicalEditor, type NodeKey } from "lexical";

const MARKDOWN_LINK_CLASS = "block-editor__link--markdown";
const AUTO_LINK_CLASS = "block-editor__link--auto";

function syncLinkElementClass(editor: LexicalEditor, key: NodeKey): void {
  const element = editor.getElementByKey(key);
  if (!element) return;

  editor.getEditorState().read(
    () => {
      const node = $getNodeByKey(key);
      const isAutoLink = $isAutoLinkNode(node);
      const isMarkdownLink = $isLinkNode(node) && !isAutoLink;

      element.classList.toggle(AUTO_LINK_CLASS, isAutoLink);
      element.classList.toggle(MARKDOWN_LINK_CLASS, isMarkdownLink);
    },
    { editor },
  );
}

export function registerLinkDomClassSync(editor: LexicalEditor): () => void {
  return mergeRegister(
    editor.registerMutationListener(LinkNode, (mutations) => {
      for (const [key, mutation] of mutations) {
        if (mutation !== "destroyed") syncLinkElementClass(editor, key);
      }
    }),
    editor.registerMutationListener(AutoLinkNode, (mutations) => {
      for (const [key, mutation] of mutations) {
        if (mutation !== "destroyed") syncLinkElementClass(editor, key);
      }
    }),
  );
}
