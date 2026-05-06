import {
  $createListItemNode,
  $createListNode,
  type ListItemNode,
  type ListNode,
  type ListType,
} from "@lexical/list";
import type { LexicalNode } from "lexical";

import type { SemanticBlock, SemanticList, SemanticListItem } from "../../model";

export function listItemToLexical(
  item: SemanticListItem,
  listType: ListType,
  writeBlock: (node: SemanticBlock) => LexicalNode[],
): LexicalNode {
  const listItem = $createListItemNode(listType === "check" ? item.checked === true : undefined);
  listItem.splice(
    0,
    0,
    item.children.flatMap((child) => writeBlock(child)),
  );
  return listItem;
}

export function listToLexical(
  node: SemanticList,
  writeBlock: (node: SemanticBlock) => LexicalNode[],
): LexicalNode {
  const hasTaskItems = node.children.some((item) => typeof item.checked === "boolean");
  const listType: ListType = node.ordered ? "number" : hasTaskItems ? "check" : "bullet";
  const list = $createListNode(listType, 1);
  list.append(...node.children.map((item) => listItemToLexical(item, listType, writeBlock)));
  return list;
}

export function listItemFromLexical(
  node: ListItemNode,
  readContainerChildren: (children: ReadonlyArray<LexicalNode>) => SemanticBlock[],
): SemanticListItem {
  return {
    ...(typeof node.getChecked() === "boolean" ? { checked: node.getChecked() } : {}),
    children: readContainerChildren(node.getChildren()),
    type: "listItem",
  };
}

export function listFromLexical(
  node: ListNode,
  readListItem: (node: LexicalNode) => SemanticListItem | null,
): SemanticList {
  return {
    children: node.getChildren().flatMap((child) => {
      const item = readListItem(child);
      return item ? [item] : [];
    }),
    ordered: node.getListType() === "number",
    type: "list",
  };
}
