import "../syntax/code/index.css";
import "../syntax/emphasis/index.css";
import "../syntax/heading/index.css";
import "../syntax/link/index.css";
import "../syntax/list/index.css";
import "../syntax/paragraph/index.css";
import "../syntax/placeholders/index.css";
import "../syntax/quote/index.css";
import "../syntax/thematic-break/index.css";
import { CodeNode } from "@lexical/code";
import { HorizontalRuleNode } from "@lexical/extension";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import type { EditorThemeClasses, LexicalNodeConfig } from "lexical";
import type { ReactNode } from "react";

import { PlaceholderBlockNode, PlaceholderInlineNode } from "../syntax/placeholders";

export const blockEditorNodes: ReadonlyArray<LexicalNodeConfig> = [
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

export const blockEditorPlugins: ReadonlyArray<ReactNode> = [
  <ListPlugin hasStrictIndent={false} key="list" shouldPreserveNumbering />,
  <LinkPlugin key="link" />,
];

export const blockEditorTheme: EditorThemeClasses = {
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
};
