import "./index.css";
import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import type { BlockContent, ListContent, Parent } from "mdast";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

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

      return [
        {
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
      const list = $createListNode(ordered ? "number" : "bullet", start);
      list.append(...ctx.importChildren(node as Parent, formats));
      return [list];
    },
    listItem: (node, ctx, formats) => {
      const listItem = $createListItemNode();
      listItem.append(...ctx.importChildren(node as Parent, formats));
      return [listItem];
    },
  },
  lexicalNodes: [ListNode, ListItemNode],
  lexicalPlugins: [
    {
      key: "list",
      element: <ListPlugin hasStrictIndent={false} shouldPreserveNumbering />,
    },
  ],
  markdownTransformers: [UNORDERED_LIST, ORDERED_LIST],
  name: "list",
  theme: {
    list: {
      listitem: "block-editor__list-item",
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
