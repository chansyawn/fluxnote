import "./list/list.css";
import { createCodeBlockControlsPlugin, type CodeBlockControlsStateStore } from "./code";
import { createLinkPopoverPlugin, type LinkPopoverStateStore } from "./link";
import { listSyntaxPlugins } from "./list";

export const syntaxPlugins = [...listSyntaxPlugins];

export function createSyntaxPlugins(
  linkPopoverStateStore: LinkPopoverStateStore,
  codeBlockControlsStateStore: CodeBlockControlsStateStore,
) {
  return [
    ...syntaxPlugins,
    createLinkPopoverPlugin(linkPopoverStateStore),
    createCodeBlockControlsPlugin(codeBlockControlsStateStore),
  ];
}
