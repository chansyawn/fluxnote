import type { TextMatchTransformer } from "@lexical/markdown";

import { $createImageNode, $isImageNode, ImageNode } from "./image-node";

const IMAGE_IMPORT_REG_EXP = /!\[([^\]]*)\]\(([^()\s]+)(?:\s"((?:[^"\\]|\\.)*)"\s*)?\)/;
const IMAGE_REG_EXP = /!\[([^\]]*)\]\(([^()\s]+)(?:\s"((?:[^"\\]|\\.)*)"\s*)?\)$/;

function unescapeMarkdownValue(value: string): string {
  return value.replace(/\\([\\[\]()"!])/g, "$1");
}

function escapeAltText(value: string): string {
  return value.replace(/([\\\]])/g, "\\$1");
}

function escapeTitle(value: string): string {
  return value.replace(/([\\"])/g, "\\$1");
}

export const IMAGE: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }

    const alt = escapeAltText(node.getAlt());
    const src = node.getSrc();
    const title = node.getTitle();
    return title ? `![${alt}](${src} "${escapeTitle(title)}")` : `![${alt}](${src})`;
  },
  importRegExp: IMAGE_IMPORT_REG_EXP,
  regExp: IMAGE_REG_EXP,
  replace: (textNode, match) => {
    const [, rawAlt = "", rawSrc = "", rawTitle] = match;
    if (!rawSrc) {
      return;
    }

    textNode.replace(
      $createImageNode({
        alt: unescapeMarkdownValue(rawAlt),
        src: unescapeMarkdownValue(rawSrc),
        title: rawTitle ? unescapeMarkdownValue(rawTitle) : null,
      }),
    );
  },
  trigger: ")",
  type: "text-match",
};
