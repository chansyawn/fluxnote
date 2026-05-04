import "./index.css";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import type { BlockContent, ListContent, Parent } from "mdast";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";
import { $createPlaceholderBlockNode } from "../placeholders/placeholder-block-node";

function isCheckedValue(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export const listModule: MarkdownSyntaxModule = {
  exportMdast: {
    list: (node, ctx) => {
      if (!$isListNode(node)) {
        return [];
      }

      const ordered = node.getListType() === "number";
      return [
        {
          children: ctx.exportChildren(node) as ListContent[],
          ordered,
          spread: false,
          start: ordered ? node.getStart() : null,
          type: "list",
        },
      ];
    },
    listitem: (node, ctx) => {
      if (!$isListItemNode(node)) {
        return [];
      }

      const serializedNode = node.exportJSON();
      return [
        {
          checked: serializedNode.checked,
          children: ctx.exportChildren(node) as BlockContent[],
          spread: false,
          type: "listItem",
        },
      ];
    },
  },
  importMdast: {
    list: (node, ctx, formats) => {
      const ordered = "ordered" in node && node.ordered === true;
      const start = "start" in node && typeof node.start === "number" ? node.start : 1;
      const hasCheckedItems =
        "children" in node &&
        Array.isArray(node.children) &&
        node.children.some((child) => "checked" in child && typeof child.checked === "boolean");
      if (hasCheckedItems) {
        return [$createPlaceholderBlockNode(ctx.getRawMarkdown(node), node.type)];
      }

      const list = $createListNode(ordered ? "number" : "bullet", start);
      list.append(...ctx.importChildren(node as Parent, formats));
      return [list];
    },
    listItem: (node, ctx, formats) => {
      const checked = "checked" in node && isCheckedValue(node.checked) ? node.checked : undefined;
      const listItem = $createListItemNode(checked);
      listItem.append(...ctx.importChildren(node as Parent, formats));
      listItem.setChecked(checked);
      return [listItem];
    },
  },
  lexicalNodes: [ListNode, ListItemNode],
  lexicalPlugins: [
    {
      key: "list",
      element: <ListPlugin hasStrictIndent={false} shouldPreserveNumbering />,
    },
    {
      key: "check-list",
      element: <CheckListPlugin />,
    },
  ],
  markdownTransformers: [UNORDERED_LIST, ORDERED_LIST, CHECK_LIST],
  name: "list",
  theme: {
    list: {
      checklist: "block-editor__list block-editor__list--check",
      listitem: "block-editor__list-item",
      listitemChecked: "block-editor__list-item block-editor__list-item--checked",
      listitemUnchecked: "block-editor__list-item block-editor__list-item--unchecked",
      nested: {
        listitem: "block-editor__list-item block-editor__list-item--nested",
      },
      ol: "block-editor__list block-editor__list--ordered",
      ul: "block-editor__list block-editor__list--unordered",
      ulDepth: [
        "block-editor__list--unordered-depth-disc",
        "block-editor__list--unordered-depth-circle",
        "block-editor__list--unordered-depth-square",
      ],
    },
  },
};
