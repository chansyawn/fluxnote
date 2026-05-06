import "./index.css";
import type { SyntaxRegistration } from "../registration";
import { SoftBreakNode } from "./soft-break-node";
import { SoftBreakShortcutPlugin } from "./soft-break-shortcut-plugin";

export { $createSoftBreakNode, $isSoftBreakNode, SoftBreakNode } from "./soft-break-node";
export {
  applySoftBreakAtSelection,
  registerSoftBreakShortcut,
  SoftBreakShortcutPlugin,
} from "./soft-break-shortcut-plugin";

export const BREAK_SYNTAX = {
  id: "break",
  lexicalNodeNames: ["SoftBreakNode", "LineBreakNode"],
  mdastTypes: ["break", "text"],
  nodes: [SoftBreakNode],
  runtimePlugins: () => [<SoftBreakShortcutPlugin key="soft-break-shortcut" />],
  semanticTypes: ["softBreak", "hardBreak"],
} satisfies SyntaxRegistration;
