import { AutoLinkExtension, createLinkMatcherWithRegExp, LinkExtension } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { configExtension, defineExtension } from "lexical";

import "./index.css";
import { registerLinkDomClassSync } from "./link-dom";
import { LinkHoverControls } from "./link-popover";

export { linkFromLexical, linkToLexical } from "./lexical";

export const LINK_MARKDOWN_SHORTCUT_TRANSFORMERS = [LINK];

const HTTP_URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,63}\b[-a-zA-Z0-9()@:%_+.~#?&//=]*/,
);

export const LINK_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/link",
  dependencies: [
    LinkExtension,
    configExtension(AutoLinkExtension, {
      matchers: [HTTP_URL_MATCHER],
    }),
  ],
  theme: {
    link: "block-editor__link",
  },
  register(editor) {
    return registerLinkDomClassSync(editor);
  },
});

export const LINK_SYNTAX_REACT_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/link/react",
  dependencies: [
    configExtension(ReactExtension, {
      decorators: [LinkHoverControls],
    }),
  ],
});
