import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  HISTORIC_TAG,
  type LexicalNode,
  type TextNode,
} from "lexical";
import { useEffect } from "react";

const TASK_MARKER = "[] ";

function hasContentBeforeNode(node: LexicalNode): boolean {
  return node.getPreviousSiblings().some((sibling) => sibling.getTextContent().length > 0);
}

function getContainingListItem(node: LexicalNode): ListItemNode | null {
  let current: LexicalNode | null = node;

  while (current) {
    if ($isListItemNode(current)) {
      return current;
    }
    current = current.getParent();
  }

  return null;
}

function findShortcutTextNode(): TextNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchor = selection.anchor;
  const node = anchor.getNode();
  if (!$isTextNode(node) || anchor.type !== "text" || anchor.offset < TASK_MARKER.length) {
    return null;
  }

  const text = node.getTextContent();
  const markerStart = anchor.offset - TASK_MARKER.length;
  if (text.slice(markerStart, anchor.offset) !== TASK_MARKER) {
    return null;
  }

  if (text.slice(0, markerStart).length > 0) {
    return null;
  }

  const parent = node.getParent();
  if (!$isElementNode(parent) || hasContentBeforeNode(node)) {
    return null;
  }

  const listItem = getContainingListItem(parent);
  if (listItem && parent !== listItem && hasContentBeforeNode(parent)) {
    return null;
  }

  return node;
}

function removeTaskMarker(node: TextNode): void {
  const text = node.getTextContent();
  const nextText = text.slice(TASK_MARKER.length);
  node.setTextContent(nextText);
  if (nextText.length > 0) {
    node.select(0, 0);
  }
}

function createTaskListFromParagraph(textNode: TextNode): boolean {
  const paragraph = textNode.getParent();
  if (!$isParagraphNode(paragraph)) {
    return false;
  }

  removeTaskMarker(textNode);

  const taskList = $createListNode("check", 1);
  const taskItem = $createListItemNode(false);
  paragraph.replace(taskList);
  taskList.append(taskItem);
  taskItem.splice(0, 0, [paragraph]);
  taskItem.selectStart();
  return true;
}

function createTaskListFromListItem(textNode: TextNode, listItem: ListItemNode): boolean {
  const list = listItem.getParent();
  if (!$isListNode(list)) {
    return false;
  }

  removeTaskMarker(textNode);

  const taskList = $createListNode("check", 1);
  const taskItem = $createListItemNode(false);
  taskItem.splice(0, 0, listItem.getChildren());
  taskList.append(taskItem);

  listItem.insertAfter(taskList);
  listItem.remove();
  if (list.getChildrenSize() === 0) {
    list.remove();
  }

  taskItem.selectStart();
  return true;
}

export function applyTaskListShortcutAtSelection(): boolean {
  const textNode = findShortcutTextNode();
  if (!textNode) {
    return false;
  }

  const listItem = getContainingListItem(textNode);
  if (listItem) {
    return createTaskListFromListItem(textNode, listItem);
  }

  return createTaskListFromParagraph(textNode);
}

export function TaskListShortcutPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      editor.registerUpdateListener(({ dirtyLeaves, editorState, tags }) => {
        if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG) || dirtyLeaves.size === 0) {
          return;
        }

        if (!editorState.read(() => findShortcutTextNode() !== null)) {
          return;
        }

        editor.update(() => {
          applyTaskListShortcutAtSelection();
        });
      }),
    [editor],
  );

  return null;
}
