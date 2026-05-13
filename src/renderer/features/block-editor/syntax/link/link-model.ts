import {
  $createLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  type AutoLinkNode,
  type LinkNode,
} from "@lexical/link";
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  SKIP_DOM_SELECTION_TAG,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type UpdateTag,
} from "lexical";

export type LinkKind = "auto" | "markdown";

export interface LinkSnapshot {
  key: NodeKey;
  kind: LinkKind;
  text: string;
  url: string;
}

export interface ActiveLink {
  element: HTMLElement;
  link: LinkSnapshot;
}

export function sanitizeLinkUrlInput(url: string): string {
  return url.replace(/[\r\n]+/g, "");
}

function isMarkdownLinkNode(node: LexicalNode | null | undefined): node is LinkNode {
  return $isLinkNode(node) && !$isAutoLinkNode(node);
}

function readLinkSnapshot(node: LinkNode | AutoLinkNode): LinkSnapshot {
  return {
    key: node.getKey(),
    kind: $isAutoLinkNode(node) ? "auto" : "markdown",
    text: node.getTextContent(),
    url: node.getURL(),
  };
}

function getLinkElement(editor: LexicalEditor, link: LinkSnapshot): HTMLElement | null {
  const element = editor.getElementByKey(link.key);
  return element instanceof HTMLElement ? element : null;
}

function measureLink(editor: LexicalEditor, link: LinkSnapshot | null): ActiveLink | null {
  if (!link) return null;

  const element = getLinkElement(editor, link);
  return element ? { element, link } : null;
}

function readLinkFromSelection(): LinkSnapshot | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;

  const link = findLinkAncestor(selection.anchor.getNode());
  return link ? readLinkSnapshot(link) : null;
}

function unwrapLinkNode(node: LinkNode): void {
  for (const child of node.getChildren()) {
    node.insertBefore(child);
  }
  node.remove();
}

function replaceAutoLinkWithMarkdownLink(node: AutoLinkNode): void {
  const link = $createLinkNode(node.getURL(), {
    rel: node.getRel(),
    target: node.getTarget(),
    title: node.getTitle(),
  });
  link.append(...node.getChildren());
  node.replace(link);
}

function updateLinkNode(
  editor: LexicalEditor,
  key: NodeKey,
  update: (node: LexicalNode | null) => void,
  tag?: UpdateTag | UpdateTag[],
): void {
  editor.update(
    () => {
      update($getNodeByKey(key));
    },
    tag === undefined ? { discrete: true } : { discrete: true, tag },
  );
}

export function findLinkAncestor(
  node: LexicalNode | null | undefined,
): LinkNode | AutoLinkNode | null {
  let current: LexicalNode | null | undefined = node;
  while (current) {
    if ($isLinkNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

export function measureLinkFromDom(editor: LexicalEditor, domNode: Node): ActiveLink | null {
  let link: LinkSnapshot | null = null;
  editor.getEditorState().read(
    () => {
      const lexicalNode = $getNearestNodeFromDOMNode(domNode);
      const linkNode = findLinkAncestor(lexicalNode);
      link = linkNode ? readLinkSnapshot(linkNode) : null;
    },
    { editor },
  );
  return measureLink(editor, link);
}

export function measureLinkFromSelection(
  editor: LexicalEditor,
  editorState: EditorState,
): ActiveLink | null {
  let link: LinkSnapshot | null = null;
  editorState.read(() => {
    link = readLinkFromSelection();
  });
  return measureLink(editor, link);
}

export function refreshActiveLink(
  editor: LexicalEditor,
  activeLink: ActiveLink | null,
  editorState: EditorState = editor.getEditorState(),
): ActiveLink | null {
  if (!activeLink) return null;

  let link: LinkSnapshot | null = null;
  editorState.read(() => {
    const node = $getNodeByKey(activeLink.link.key);
    link = $isLinkNode(node) ? readLinkSnapshot(node) : null;
  });
  return measureLink(editor, link);
}

export function isSameActiveLink(current: ActiveLink | null, next: ActiveLink | null): boolean {
  if (current === next) return true;
  if (!current || !next) return false;

  return (
    current.element === next.element &&
    current.link.key === next.link.key &&
    current.link.kind === next.link.kind &&
    current.link.text === next.link.text &&
    current.link.url === next.link.url
  );
}

export function setMarkdownLinkUrl(editor: LexicalEditor, key: NodeKey, url: string): void {
  updateLinkNode(
    editor,
    key,
    (node) => {
      if (isMarkdownLinkNode(node)) {
        node.setURL(url);
      }
    },
    SKIP_DOM_SELECTION_TAG,
  );
}

export function removeMarkdownLink(editor: LexicalEditor, key: NodeKey): void {
  updateLinkNode(editor, key, (node) => {
    if (isMarkdownLinkNode(node)) {
      unwrapLinkNode(node);
    }
  });
}

export function convertAutoLinkToMarkdownLink(editor: LexicalEditor, key: NodeKey): void {
  updateLinkNode(editor, key, (node) => {
    if ($isAutoLinkNode(node)) {
      replaceAutoLinkWithMarkdownLink(node);
    }
  });
}
