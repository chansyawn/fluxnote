import { ListItemNode, ListNode } from "@lexical/list";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { ListKeyboardPlugin } from "./list-keyboard-plugin";
import { TaskListShortcutPlugin } from "./task-list-shortcut-plugin";

export { listFromLexical, listItemFromLexical, listItemToLexical, listToLexical } from "./lexical";
export { listFromMdast, listItemFromMdast, listItemToMdast, listToMdast } from "./mdast";

export const LIST_SYNTAX = {
  id: "list",
  lexicalNodeNames: ["ListNode", "ListItemNode"],
  mdastTypes: ["list", "listItem"],
  nodes: [ListNode, ListItemNode],
  markdownShortcuts: [CHECK_LIST, UNORDERED_LIST, ORDERED_LIST],
  runtimePlugins: ({ markdownShortcuts }) => [
    <ListPlugin key="list" hasStrictIndent={false} shouldPreserveNumbering />,
    <CheckListPlugin key="check-list" disableTakeFocusOnClick />,
    <TaskListShortcutPlugin key="task-list-shortcut" />,
    <ListKeyboardPlugin key="list-keyboard" markdownShortcuts={markdownShortcuts} />,
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
