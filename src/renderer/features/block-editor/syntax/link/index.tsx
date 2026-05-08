import { LinkExtension } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { linkFromMdast, linkToMdast } from "./mdast";

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

export const LINK_SYNTAX = {
  id: "link",
  extension: LINK_SYNTAX_EXTENSION,
  lexicalNodeNames: ["LinkNode"],
  markdownShortcuts: [LINK],
  mdastTypes: ["link"],
  semanticTypes: ["link"],
} satisfies SyntaxRegistration;
