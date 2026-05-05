import { CodeNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/extension";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { LexicalNodeConfig } from "lexical";

import { PlaceholderBlockNode, PlaceholderInlineNode } from "./placeholders";

export const syntaxNodes: ReadonlyArray<LexicalNodeConfig> = [
  CodeNode,
  HorizontalRuleNode,
  HeadingNode,
  LinkNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  PlaceholderBlockNode,
  PlaceholderInlineNode,
];
