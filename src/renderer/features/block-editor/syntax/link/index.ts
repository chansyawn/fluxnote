import { LinkExtension } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";

export { linkFromLexical, linkToLexical } from "./lexical";

export const LINK_MARKDOWN_SHORTCUT_TRANSFORMERS = [LINK];

export const LINK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/link",
  dependencies: [
    configExtension(LinkExtension, {
      attributes: undefined,
      validateUrl: undefined,
    }),
  ],
  theme: {
    link: "block-editor__link",
  },
});
