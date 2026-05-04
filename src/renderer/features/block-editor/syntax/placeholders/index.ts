import "./index.css";
import type { MarkdownSyntaxModule } from "../../core/syntax-module";
import {
  $createPlaceholderBlockNode,
  $isPlaceholderBlockNode,
  PlaceholderBlockNode,
} from "./placeholder-block-node";
import {
  $createPlaceholderInlineNode,
  $isPlaceholderInlineNode,
  PlaceholderInlineNode,
} from "./placeholder-inline-node";

const inlinePlaceholderTypes = new Set([
  "footnoteReference",
  "image",
  "imageReference",
  "inlineMath",
]);

export const placeholdersModule: MarkdownSyntaxModule = {
  exportMdast: {
    "placeholder-block": (node) => {
      if (!$isPlaceholderBlockNode(node)) {
        return [];
      }

      return [
        {
          mdastType: node.getMdastType(),
          type: "rawMarkdown",
          value: node.getRawMarkdown(),
        },
      ];
    },
    "placeholder-inline": (node) => {
      if (!$isPlaceholderInlineNode(node)) {
        return [];
      }

      return [
        {
          mdastType: node.getMdastType(),
          type: "rawMarkdown",
          value: node.getRawMarkdown(),
        },
      ];
    },
  },
  importMdast: {
    footnoteDefinition: (node, ctx) => [
      $createPlaceholderBlockNode(ctx.getRawMarkdown(node), node.type),
    ],
    footnoteReference: (node, ctx) => [
      $createPlaceholderInlineNode(ctx.getRawMarkdown(node), node.type),
    ],
    html: (node, ctx) => [$createPlaceholderBlockNode(ctx.getRawMarkdown(node), node.type)],
    image: (node, ctx) => [$createPlaceholderInlineNode(ctx.getRawMarkdown(node), node.type)],
    inlineMath: (node, ctx) => [$createPlaceholderInlineNode(ctx.getRawMarkdown(node), node.type)],
    math: (node, ctx) => [$createPlaceholderBlockNode(ctx.getRawMarkdown(node), node.type)],
    table: (node, ctx) => [$createPlaceholderBlockNode(ctx.getRawMarkdown(node), node.type)],
    unknown: (node, ctx) =>
      inlinePlaceholderTypes.has(node.type)
        ? [$createPlaceholderInlineNode(ctx.getRawMarkdown(node), node.type)]
        : [$createPlaceholderBlockNode(ctx.getRawMarkdown(node), node.type)],
  },
  lexicalNodes: [PlaceholderBlockNode, PlaceholderInlineNode],
  name: "placeholders",
};
