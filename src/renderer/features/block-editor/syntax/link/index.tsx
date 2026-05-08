import { LinkExtension } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { MarkdownShortcutExtension } from "../../markdown/markdown-shortcut-extension";
import type { SyntaxRegistration } from "../registration";

export { linkFromMdast, linkToMdast } from "./mdast";

export const LINK_MARKDOWN_SHORTCUT_TRANSFORMERS = [LINK];

export const LINK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/link",
  dependencies: [
    configExtension(LinkExtension, {
      attributes: undefined,
      validateUrl: undefined,
    }),
    configExtension(MarkdownShortcutExtension, {
      transformers: LINK_MARKDOWN_SHORTCUT_TRANSFORMERS,
    }),
  ],
  theme: {
    link: "block-editor__link",
  },
});

export const LINK_SYNTAX = {
  id: "link",
  extension: LINK_SYNTAX_EXTENSION,
  lexicalNodeNames: ["LinkNode"],
  mdastTypes: ["link"],
  semanticTypes: ["link"],
} satisfies SyntaxRegistration;
