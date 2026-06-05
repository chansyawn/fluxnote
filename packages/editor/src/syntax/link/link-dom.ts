import { $isAutoLinkNode, $isLinkNode, AutoLinkNode, LinkNode } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import { $getNodeByKey, type LexicalEditor, type LexicalNode, type NodeKey } from "lexical";

const MARKDOWN_LINK_CLASS = "block-editor__link--markdown";
const AUTO_LINK_CLASS = "block-editor__link--auto";

export interface LinkElementClassState {
  auto: boolean;
  markdown: boolean;
}

export function getLinkElementClassState(
  node: LexicalNode | null | undefined,
): LinkElementClassState {
  const auto = $isAutoLinkNode(node);
  return {
    auto,
    markdown: $isLinkNode(node) && !auto,
  };
}

function applyLinkElementClasses(element: HTMLElement, state: LinkElementClassState): void {
  element.classList.toggle(AUTO_LINK_CLASS, state.auto);
  element.classList.toggle(MARKDOWN_LINK_CLASS, state.markdown);
}

function syncLinkElementClasses(editor: LexicalEditor, key: NodeKey): void {
  const element = editor.getElementByKey(key);
  if (!element) return;

  editor.getEditorState().read(
    () => {
      const node = $getNodeByKey(key);
      applyLinkElementClasses(element, getLinkElementClassState(node));
    },
    { editor },
  );
}

export function registerLinkDomClassSync(editor: LexicalEditor): () => void {
  const handleMutations = (mutations: Map<NodeKey, "created" | "destroyed" | "updated">) => {
    for (const [key, mutation] of mutations) {
      if (mutation !== "destroyed") syncLinkElementClasses(editor, key);
    }
  };

  return mergeRegister(
    editor.registerMutationListener(LinkNode, handleMutations),
    editor.registerMutationListener(AutoLinkNode, handleMutations),
  );
}
