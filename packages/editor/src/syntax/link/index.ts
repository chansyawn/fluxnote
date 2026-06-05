import { AutoLinkExtension, createLinkMatcherWithRegExp, LinkExtension } from "@lexical/link";
import { LINK } from "@lexical/markdown";
import { ReactExtension } from "@lexical/react/ReactExtension";
import { configExtension, defineExtension } from "lexical";

import { registerLinkDomClassSync } from "./link-dom";
import { HTTP_URL_REGEXP } from "./link-model";
import { LinkHoverControls } from "./link-popover";

export { linkFromLexical, linkToLexical } from "./lexical";

export const LINK_MARKDOWN_SHORTCUT_TRANSFORMERS = [LINK];

const HTTP_URL_MATCHER = createLinkMatcherWithRegExp(HTTP_URL_REGEXP);

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
