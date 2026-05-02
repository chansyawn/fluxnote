import { CodeHighlightNode, CodeNode } from "@lexical/code-core";
import { HorizontalRuleNode } from "@lexical/extension";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { BlockEditorImageNode } from "@renderer/features/block-editor/image/block-editor-image-node";
import type { Klass, LexicalNode } from "lexical";

export const BLOCK_EDITOR_NODES: ReadonlyArray<Klass<LexicalNode>> = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  CodeNode,
  CodeHighlightNode,
  HorizontalRuleNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  BlockEditorImageNode,
];
