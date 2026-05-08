import { CheckListExtension, ListExtension } from "@lexical/list";
import { CHECK_LIST, ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { ListKeyboardPlugin } from "./list-keyboard-plugin";
import { TaskListShortcutPlugin } from "./task-list-shortcut-plugin";

export { listFromLexical, listItemFromLexical, listItemToLexical, listToLexical } from "./lexical";
export { listFromMdast, listItemFromMdast, listItemToMdast, listToMdast } from "./mdast";

export const LIST_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/list",
  dependencies: [
    configExtension(ListExtension, {
      hasStrictIndent: false,
      shouldPreserveNumbering: true,
    }),
    configExtension(CheckListExtension, {
      disableTakeFocusOnClick: true,
    }),
  ],
  theme: {
    list: {
      checklist: "block-editor__list--check",
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
});

export const LIST_SYNTAX = {
  id: "list",
  extension: LIST_SYNTAX_EXTENSION,
  lexicalNodeNames: ["ListNode", "ListItemNode"],
  markdownShortcuts: [CHECK_LIST, UNORDERED_LIST, ORDERED_LIST],
  mdastTypes: ["list", "listItem"],
  runtimePlugins: ({ markdownShortcuts }) => [
    <TaskListShortcutPlugin key="task-list-shortcut" />,
    <ListKeyboardPlugin key="list-keyboard" markdownShortcuts={markdownShortcuts} />,
  ],
  semanticTypes: ["list", "listItem"],
} satisfies SyntaxRegistration;
