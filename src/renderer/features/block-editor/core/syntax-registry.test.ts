import { CodeNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/extension";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
  BOLD_STAR,
  CHECK_LIST,
  CODE,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { describe, expect, it } from "vite-plus/test";

import { PlaceholderBlockNode } from "../syntax/placeholders/placeholder-block-node";
import { PlaceholderInlineNode } from "../syntax/placeholders/placeholder-inline-node";
import {
  blockEditorTheme,
  lexicalNodes,
  liveInputTransformers,
  syntaxPlugins,
} from "./syntax-registry";

describe("syntax registry", () => {
  it("aggregates lexical nodes from syntax modules", () => {
    expect(lexicalNodes).toContain(HeadingNode);
    expect(lexicalNodes).toContain(QuoteNode);
    expect(lexicalNodes).toContain(ListNode);
    expect(lexicalNodes).toContain(ListItemNode);
    expect(lexicalNodes).toContain(LinkNode);
    expect(lexicalNodes).toContain(CodeNode);
    expect(lexicalNodes).toContain(HorizontalRuleNode);
    expect(lexicalNodes).toContain(PlaceholderBlockNode);
    expect(lexicalNodes).toContain(PlaceholderInlineNode);
  });

  it("aggregates markdown shortcut transformers from syntax modules", () => {
    expect(liveInputTransformers).toEqual(
      expect.arrayContaining([
        HEADING,
        QUOTE,
        UNORDERED_LIST,
        ORDERED_LIST,
        CHECK_LIST,
        CODE,
        BOLD_STAR,
        ITALIC_STAR,
        STRIKETHROUGH,
        INLINE_CODE,
        LINK,
      ]),
    );
  });

  it("aggregates lexical plugins from syntax modules", () => {
    expect(syntaxPlugins.map((plugin) => plugin.name)).toEqual(
      expect.arrayContaining(["ListSyntaxPlugin", "LinkSyntaxPlugin"]),
    );
  });

  it("aggregates theme classes without replacing nested theme groups", () => {
    expect(blockEditorTheme.paragraph).toBe("block-editor__paragraph");
    expect(blockEditorTheme.heading?.h1).toContain("block-editor__heading--h1");
    expect(blockEditorTheme.text?.bold).toBe("block-editor__text--strong");
    expect(blockEditorTheme.text?.code).toBe("block-editor__inline-code");
    expect(blockEditorTheme.list?.ul).toContain("block-editor__list--unordered");
    expect(blockEditorTheme.list?.nested?.listitem).toContain("block-editor__list-item--nested");
  });
});
