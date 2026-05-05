import { LinkNode } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";

import "./index.css";
import type { SyntaxRegistration } from "../registration";

export { linkFromMdast, linkToMdast } from "./mdast";

export const LINK_SYNTAX = {
  id: "link",
  lexicalNodeNames: ["LinkNode"],
  mdastTypes: ["link"],
  nodes: [LinkNode],
  markdownShortcuts: [LINK],
  runtimePlugins: () => [<LinkPlugin key="link" />],
  semanticTypes: ["link"],
  theme: {
    link: "block-editor__link",
  },
} satisfies SyntaxRegistration;
