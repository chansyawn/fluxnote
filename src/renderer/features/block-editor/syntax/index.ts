import "./list/list.css";
import type { BlockEditorRuntime } from "../core/types";
import {
  codeHighlightPlugins,
  createCodeBlockViewPlugin,
  type CodeBlockViewPluginInput,
} from "./code";
import { createLinkPopoverPlugin, type LinkPopoverPluginInput } from "./link";
import { listSyntaxPlugins } from "./list";

export const syntaxPlugins = [...listSyntaxPlugins];

interface BlockEditorSyntaxPluginInput {
  codeBlockNodeViewFactory: CodeBlockViewPluginInput["nodeViewFactory"];
  linkPluginViewFactory: LinkPopoverPluginInput["pluginViewFactory"];
  runtime: BlockEditorRuntime;
}

export function createSyntaxPlugins({
  codeBlockNodeViewFactory,
  linkPluginViewFactory,
  runtime,
}: BlockEditorSyntaxPluginInput) {
  return [
    ...syntaxPlugins,
    ...codeHighlightPlugins,
    createLinkPopoverPlugin({ pluginViewFactory: linkPluginViewFactory, runtime }),
    createCodeBlockViewPlugin({ nodeViewFactory: codeBlockNodeViewFactory, runtime }),
  ];
}
