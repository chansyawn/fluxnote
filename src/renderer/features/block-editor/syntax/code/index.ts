import "./code.css";

export {
  codeHighlightPlugins,
  configureCodeHighlight,
  type CodeHighlightPluginInput,
  type CodeHighlightThemeMode,
} from "./code-highlight-plugin";
export { createCodeBlockViewPlugin, type CodeBlockViewPluginInput } from "./code-block-node-view";
export { getShikiLanguage, SHIKI_CODE_LANGUAGES } from "./code-language-options";
