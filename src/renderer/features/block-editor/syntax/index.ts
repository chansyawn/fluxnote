import "./list/list.css";
import type { BlockEditorRuntime } from "../core/types";
import {
  codeHighlightPlugins,
  createCodeBlockViewPlugin,
  type CodeBlockViewPluginInput,
} from "./code";
import { createLinkPopoverPlugin, type LinkPopoverPluginInput } from "./link";
import { listSyntaxPlugins } from "./list";
import { createTableControlPlugin, type TableControlPluginInput } from "./table";

export const syntaxPlugins = [...listSyntaxPlugins];

interface BlockEditorSyntaxPluginInput {
  codeBlockNodeViewFactory: CodeBlockViewPluginInput["nodeViewFactory"];
  linkPluginViewFactory: LinkPopoverPluginInput["pluginViewFactory"];
  tablePluginViewFactory: TableControlPluginInput["pluginViewFactory"];
  runtime: BlockEditorRuntime;
}

export function createSyntaxPlugins({
  codeBlockNodeViewFactory,
  linkPluginViewFactory,
  tablePluginViewFactory,
  runtime,
}: BlockEditorSyntaxPluginInput) {
  return [
    ...syntaxPlugins,
    ...codeHighlightPlugins,
    createTableControlPlugin({ pluginViewFactory: tablePluginViewFactory }),
    createLinkPopoverPlugin({ pluginViewFactory: linkPluginViewFactory, runtime }),
    createCodeBlockViewPlugin({ nodeViewFactory: codeBlockNodeViewFactory, runtime }),
  ];
}
