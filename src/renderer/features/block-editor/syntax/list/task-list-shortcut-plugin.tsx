import {
  $createListItemNode,
  $createListNode,
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
  type LexicalEditor,
  type LexicalNode,
  type TextNode,
} from "lexical";
import { useEffect } from "react";

import { getContainingListItem } from "./list-selection";

const TASK_MARKER_PATTERN = /^(\[[ xX]?\] )/;

function hasContentBeforeNode(node: LexicalNode): boolean {
  return node.getPreviousSiblings().some((sibling) => sibling.getTextContent().length > 0);
}

function findShortcutTextNode(): TextNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchor = selection.anchor;
  const node = anchor.getNode();
  if (!$isTextNode(node) || anchor.type !== "text") {
    return null;
  }

  const text = node.getTextContent();
  const shortcutText = text.slice(0, anchor.offset);
  const markerMatch = shortcutText.match(TASK_MARKER_PATTERN);
  if (!markerMatch || markerMatch[0].length !== anchor.offset) {
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
  const markerMatch = text.match(TASK_MARKER_PATTERN);
  const nextText = markerMatch ? text.slice(markerMatch[0].length) : text;
  node.setTextContent(nextText);
  if (nextText.length > 0) {
    node.select(0, 0);
  }
}

function readTaskMarkerCheckedState(node: TextNode): boolean {
  const markerMatch = node.getTextContent().match(TASK_MARKER_PATTERN);
  return markerMatch?.[0].toLowerCase().includes("x") ?? false;
}

function createTaskListFromParagraph(textNode: TextNode): boolean {
  const paragraph = textNode.getParent();
  if (!$isParagraphNode(paragraph)) {
    return false;
  }

  const checked = readTaskMarkerCheckedState(textNode);
  removeTaskMarker(textNode);

  const taskList = $createListNode("check", 1);
  const taskItem = $createListItemNode(checked);
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

  const checked = readTaskMarkerCheckedState(textNode);
  removeTaskMarker(textNode);

  const taskList = $createListNode("check", 1);
  const taskItem = $createListItemNode(checked);
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

export function registerTaskListShortcut(editor: LexicalEditor): () => void {
  return editor.registerUpdateListener(({ dirtyLeaves, editorState, tags }) => {
    if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG) || dirtyLeaves.size === 0) {
      return;
    }

    if (!editorState.read(() => findShortcutTextNode() !== null)) {
      return;
    }

    editor.update(() => {
      applyTaskListShortcutAtSelection();
    });
  });
}

export function TaskListShortcutPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => registerTaskListShortcut(editor), [editor]);

  return null;
}
