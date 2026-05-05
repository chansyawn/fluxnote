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
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { isValidElement } from "react";
import { describe, expect, it } from "vite-plus/test";

import { PlaceholderBlockNode, PlaceholderInlineNode } from "./placeholders";
import {
  MARKDOWN_SHORTCUT_TRANSFORMERS,
  SYNTAX_LEXICAL_NODE_NAMES,
  SYNTAX_MDAST_TYPES,
  SYNTAX_NODES,
  SYNTAX_RUNTIME_PLUGINS,
  SYNTAX_REGISTRATIONS,
  SYNTAX_SEMANTIC_TYPES,
  SYNTAX_THEME,
} from "./registry";
import { THEMATIC_BREAK_SYNTAX } from "./thematic-break";

describe("syntax registry", () => {
  it("exposes lexical nodes in the established runtime order", () => {
    expect(SYNTAX_NODES).toEqual([
      CodeNode,
      HorizontalRuleNode,
      HeadingNode,
      LinkNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      PlaceholderBlockNode,
      PlaceholderInlineNode,
    ]);
  });

  it("exposes markdown shortcuts in the established transformer order", () => {
    expect(MARKDOWN_SHORTCUT_TRANSFORMERS).toEqual([
      HEADING,
      QUOTE,
      CHECK_LIST,
      UNORDERED_LIST,
      ORDERED_LIST,
      THEMATIC_BREAK_SYNTAX.markdownShortcuts?.[0],
      CODE,
      BOLD_STAR,
      ITALIC_STAR,
      STRIKETHROUGH,
      INLINE_CODE,
      LINK,
    ]);
  });

  it("keeps syntax ids stable", () => {
    expect(SYNTAX_REGISTRATIONS.map((syntax) => syntax.id)).toEqual([
      "heading",
      "quote",
      "list",
      "thematic-break",
      "code",
      "inline-mark",
      "link",
      "paragraph",
      "placeholders",
    ]);
  });

  it("exposes runtime plugins from syntax registrations", () => {
    expect(
      SYNTAX_RUNTIME_PLUGINS.map((plugin) => (isValidElement(plugin) ? plugin.type : null)),
    ).toEqual([ListPlugin, LinkPlugin]);
  });

  it("combines theme fragments from syntax registrations", () => {
    expect(SYNTAX_THEME).toEqual({
      code: "block-editor__code",
      heading: {
        h1: "block-editor__heading block-editor__heading--h1",
        h2: "block-editor__heading block-editor__heading--h2",
        h3: "block-editor__heading block-editor__heading--h3",
        h4: "block-editor__heading block-editor__heading--h4",
        h5: "block-editor__heading block-editor__heading--h5",
        h6: "block-editor__heading block-editor__heading--h6",
      },
      hr: "block-editor__horizontal-rule",
      link: "block-editor__link",
      list: {
        listitem: "block-editor__list-item",
        listitemChecked: "block-editor__list-item block-editor__list-item--checked",
        listitemUnchecked: "block-editor__list-item block-editor__list-item--unchecked",
        nested: {
          listitem: "block-editor__list-item block-editor__list-item--nested",
        },
        ol: "block-editor__list block-editor__list--ordered",
        ul: "block-editor__list block-editor__list--unordered",
        ulDepth: [
          "block-editor__list--unordered-depth-disc",
          "block-editor__list--unordered-depth-circle",
          "block-editor__list--unordered-depth-square",
        ],
      },
      paragraph: "block-editor__paragraph",
      quote: "block-editor__quote",
      text: {
        bold: "block-editor__text--strong",
        code: "block-editor__inline-code",
        italic: "block-editor__text--emphasis",
        strikethrough: "block-editor__text--strikethrough",
      },
    });
  });

  it("exposes syntax metadata for maintenance checks", () => {
    expect(SYNTAX_LEXICAL_NODE_NAMES).toEqual([
      "CodeNode",
      "HorizontalRuleNode",
      "HeadingNode",
      "LinkNode",
      "ListNode",
      "ListItemNode",
      "QuoteNode",
      "PlaceholderBlockNode",
      "PlaceholderInlineNode",
    ]);
    expect(SYNTAX_SEMANTIC_TYPES).toEqual(
      expect.arrayContaining([
        "blockquote",
        "codeBlock",
        "delete",
        "heading",
        "inlineCode",
        "link",
        "list",
        "opaqueBlock",
        "paragraph",
        "thematicBreak",
      ]),
    );
    expect(SYNTAX_MDAST_TYPES).toEqual(
      expect.arrayContaining([
        "blockquote",
        "code",
        "delete",
        "heading",
        "inlineCode",
        "link",
        "list",
        "paragraph",
        "thematicBreak",
      ]),
    );
  });
});
