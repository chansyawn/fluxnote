import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListType,
} from "@lexical/list";
import type { LexicalNode } from "lexical";
import type { BlockContent, DefinitionContent, List, ListItem } from "mdast";

// mdast ListItem children allow definitions in addition to plain block content.
type ContainerChild = BlockContent | DefinitionContent;

function deriveListType(
  items: ReadonlyArray<ListItem>,
  ordered: boolean | null | undefined,
): ListType {
  if (ordered === true) return "number";
  return items.some((it) => typeof it.checked === "boolean") ? "check" : "bullet";
}

export function listItemToLexical(
  item: ListItem,
  listType: ListType,
  writeBlock: (child: ContainerChild) => LexicalNode[],
): LexicalNode {
  const listItem = $createListItemNode(listType === "check" ? item.checked === true : undefined);
  const children = item.children.flatMap(writeBlock);
  if (children.length > 0) {
    listItem.append(...children);
  }
  return listItem;
}

export function listToLexical(
  node: List,
  writeBlock: (child: ContainerChild) => LexicalNode[],
): LexicalNode {
  const listType = deriveListType(node.children, node.ordered);
  const list = $createListNode(listType, node.start ?? 1);
  list.append(...node.children.map((item) => listItemToLexical(item, listType, writeBlock)));
  return list;
}

export function listItemFromLexical(
  node: LexicalNode,
  readContainer: (children: ReadonlyArray<LexicalNode>) => BlockContent[],
): ListItem | null {
  if (!$isListItemNode(node)) {
    return null;
  }

  const checked = node.getChecked();
  const children = readContainer(node.getChildren()) as ListItem["children"];

  return {
    checked: typeof checked === "boolean" ? checked : null,
    children,
    // Editor renders all lists as tight; loose/spread is a source-format concern
    // the WYSIWYG surface intentionally does not model.
    spread: false,
    type: "listItem",
  };
}

export function listFromLexical(
  node: LexicalNode,
  readListItem: (child: LexicalNode) => ListItem | null,
): List | null {
  if (!$isListNode(node)) {
    return null;
  }

  const ordered = node.getListType() === "number";
  const items = node.getChildren().flatMap((child) => {
    const item = readListItem(child);
    return item ? [item] : [];
  });

  return {
    children: items,
    ordered,
    spread: false,
    start: ordered ? node.getStart() : null,
    type: "list",
  };
}
