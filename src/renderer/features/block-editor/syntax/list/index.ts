import { ListItemNode, ListNode } from "@lexical/list";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { createElement } from "react";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { listFromLexical, listItemFromLexical, listItemToLexical, listToLexical } from "./lexical";
export { listFromMdast, listItemFromMdast, listItemToMdast, listToMdast } from "./mdast";

export const LIST_SYNTAX = {
  id: "list",
  lexicalNodeNames: ["ListNode", "ListItemNode"],
  mdastTypes: ["list", "listItem"],
  nodes: [ListNode, ListItemNode],
  markdownShortcuts: [CHECK_LIST, UNORDERED_LIST, ORDERED_LIST],
  runtimePlugins: () => [
    createElement(ListPlugin, {
      hasStrictIndent: false,
      key: "list",
      shouldPreserveNumbering: true,
    }),
  ],
  semanticTypes: ["list", "listItem"],
  theme: {
    list: {
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
} satisfies SyntaxRegistration;
