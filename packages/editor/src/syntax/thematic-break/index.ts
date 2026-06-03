import { HorizontalRuleExtension, HorizontalRuleNode } from "@lexical/extension";
import { mergeRegister } from "@lexical/utils";
import { defineExtension } from "lexical";

import { registerThematicBreakCommands } from "./thematic-break-commands";
import { THEMATIC_BREAK_MARKDOWN_SHORTCUTS } from "./thematic-break-shortcut";

export { thematicBreakFromLexical, thematicBreakToLexical } from "./lexical";
export { $deleteSelectedThematicBreaks, $selectThematicBreak } from "./thematic-break-commands";
export { THEMATIC_BREAK_MARKDOWN_SHORTCUTS } from "./thematic-break-shortcut";

export const THEMATIC_BREAK_MARKDOWN_SHORTCUT_TRANSFORMERS = THEMATIC_BREAK_MARKDOWN_SHORTCUTS;

export const THEMATIC_BREAK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/thematic-break",
  dependencies: [HorizontalRuleExtension],
  nodes: [HorizontalRuleNode],
  register(editor) {
    return mergeRegister(registerThematicBreakCommands(editor));
  },
  theme: {
    hr: "block-editor__horizontal-rule",
    hrSelected: "block-editor__horizontal-rule--selected",
  },
});
