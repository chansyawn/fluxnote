import { HEADING } from "@lexical/markdown";
import { RichTextExtension } from "@lexical/rich-text";
import { defineExtension } from "lexical";

import "./index.css";

export {
  depthToHeadingTag,
  headingFromLexical,
  headingTagToDepth,
  headingToLexical,
} from "./lexical";

export const HEADING_MARKDOWN_SHORTCUT_TRANSFORMERS = [HEADING];

export const HEADING_SYNTAX_EXTENSION = defineExtension({
  name: "fluxnotes/block-editor/syntax/heading",
  dependencies: [RichTextExtension],
  theme: {
    heading: {
      h1: "block-editor__heading block-editor__heading--h1",
      h2: "block-editor__heading block-editor__heading--h2",
      h3: "block-editor__heading block-editor__heading--h3",
      h4: "block-editor__heading block-editor__heading--h4",
      h5: "block-editor__heading block-editor__heading--h5",
      h6: "block-editor__heading block-editor__heading--h6",
    },
  },
});
