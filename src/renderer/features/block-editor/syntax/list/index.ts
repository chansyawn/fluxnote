import { wrapEmptyBracketsInTaskListInputRule } from "./task-list-input-rule";
import { taskListTogglePlugin } from "./task-list-plugin";

export const listSyntaxPlugins = [wrapEmptyBracketsInTaskListInputRule, taskListTogglePlugin];
