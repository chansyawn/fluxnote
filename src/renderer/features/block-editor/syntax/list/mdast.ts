import type { List, ListContent, ListItem, RootContent } from "mdast";

import type { SemanticBlock, SemanticList, SemanticListItem } from "../../model";

export const EMPTY_TASK_ITEM_PLACEHOLDER = "\u00A0";

function hasVisibleChildren(children: ListItem["children"]): boolean {
  return children.some((child) => child.type !== "paragraph" || child.children.length > 0);
}

export function listItemFromMdast(
  node: ListItem,
  readBlocks: (children: ReadonlyArray<RootContent>) => SemanticBlock[],
): SemanticListItem {
  return {
    ...("checked" in node && typeof node.checked === "boolean" ? { checked: node.checked } : {}),
    children: readBlocks(node.children),
    type: "listItem",
  };
}

export function listFromMdast(
  node: List,
  readBlocks: (children: ReadonlyArray<RootContent>) => SemanticBlock[],
): SemanticList {
  return {
    children: node.children.map((child) => listItemFromMdast(child, readBlocks)),
    ordered: node.ordered === true,
    type: "list",
  };
}

export function listItemToMdast(
  item: SemanticListItem,
  writeBlocks: (children: ReadonlyArray<SemanticBlock>) => ListItem["children"],
): ListItem {
  const children = writeBlocks(item.children);
  const isTaskItem = typeof item.checked === "boolean";

  return {
    checked: isTaskItem ? item.checked : null,
    children:
      isTaskItem && !hasVisibleChildren(children)
        ? [
            {
              children: [{ type: "text", value: EMPTY_TASK_ITEM_PLACEHOLDER }],
              type: "paragraph",
            },
          ]
        : children,
    spread: item.children.length > 1,
    type: "listItem",
  };
}

export function listToMdast(
  node: SemanticList,
  writeBlocks: (children: ReadonlyArray<SemanticBlock>) => ListItem["children"],
): List {
  return {
    children: node.children.map((item) => listItemToMdast(item, writeBlocks)) as ListContent[],
    ordered: node.ordered,
    spread: node.children.some((item) => item.children.length > 1),
    start: node.ordered ? 1 : null,
    type: "list",
  };
}
