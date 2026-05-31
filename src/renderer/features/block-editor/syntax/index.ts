import "./list/list.css";
import type { BlockEditorRuntime } from "../core/types";
import { createCodeBlockControlsPlugin, type CodeBlockControlsStateStore } from "./code";
import { createLinkPopoverPlugin, type LinkPopoverPluginInput } from "./link";
import { listSyntaxPlugins } from "./list";

export const syntaxPlugins = [...listSyntaxPlugins];

interface BlockEditorSyntaxPluginInput {
  codeBlockControlsStateStore: CodeBlockControlsStateStore;
  linkPluginViewFactory: LinkPopoverPluginInput["pluginViewFactory"];
  runtime: BlockEditorRuntime;
}

export function createSyntaxPlugins({
  codeBlockControlsStateStore,
  linkPluginViewFactory,
  runtime,
}: BlockEditorSyntaxPluginInput) {
  return [
    ...syntaxPlugins,
    createLinkPopoverPlugin({ pluginViewFactory: linkPluginViewFactory, runtime }),
    createCodeBlockControlsPlugin(codeBlockControlsStateStore),
  ];
}
