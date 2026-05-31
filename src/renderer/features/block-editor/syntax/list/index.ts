import { setListBlockCommand } from "./list-commands";
import { wrapEmptyBracketsInTaskListInputRule } from "./task-list-input-rule";
import { taskListTogglePlugin } from "./task-list-plugin";

export const listSyntaxPlugins = [
  setListBlockCommand,
  wrapEmptyBracketsInTaskListInputRule,
  taskListTogglePlugin,
];

export { createSetListBlockCommand, runSetListBlockCommand } from "./list-commands";
export type { ListBlockFormat } from "./list-commands";
