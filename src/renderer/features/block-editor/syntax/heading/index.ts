import "./index.css";
import { HEADING } from "@lexical/markdown";
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingNode,
  type HeadingTagType,
} from "@lexical/rich-text";
import type { Heading, Parent, PhrasingContent } from "mdast";

import type { MarkdownSyntaxModule } from "../../core/syntax-module";

function toHeadingTag(depth: number): HeadingTagType {
  return `h${Math.min(Math.max(depth, 1), 6)}` as HeadingTagType;
}

export const headingModule: MarkdownSyntaxModule = {
  exportMdast: {
    heading: (node, ctx) => {
      if (!$isHeadingNode(node)) {
        return [];
      }

      const depth = Number(node.getTag().slice(1)) as Heading["depth"];
      return [
        {
          children: ctx.exportChildren(node) as PhrasingContent[],
          depth,
          type: "heading",
        },
      ];
    },
  },
  importMdast: {
    heading: (node, ctx, formats) => {
      if (!("depth" in node) || typeof node.depth !== "number") {
        return [];
      }

      const heading = $createHeadingNode(toHeadingTag(node.depth));
      heading.append(...ctx.importChildren(node as Parent, formats));
      return [heading];
    },
  },
  lexicalNodes: [HeadingNode],
  markdownTransformers: [HEADING],
  name: "heading",
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
};
