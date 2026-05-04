import {
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";

export type SerializedPlaceholderInlineNode = Spread<
  {
    mdastType: string;
    raw: string;
  },
  SerializedLexicalNode
>;

function PlaceholderInline({ raw }: { raw: string }): JSX.Element {
  return (
    <span className="block-editor__placeholder-inline" contentEditable={false}>
      {raw}
    </span>
  );
}

export class PlaceholderInlineNode extends DecoratorNode<JSX.Element> {
  __raw: string;
  __mdastType: string;

  static getType(): string {
    return "placeholder-inline";
  }

  static clone(node: PlaceholderInlineNode): PlaceholderInlineNode {
    return new PlaceholderInlineNode(node.__raw, node.__mdastType, node.__key);
  }

  static importJSON(serializedNode: SerializedPlaceholderInlineNode): PlaceholderInlineNode {
    return $createPlaceholderInlineNode(serializedNode.raw, serializedNode.mdastType);
  }

  constructor(raw: string, mdastType: string, key?: NodeKey) {
    super(key);
    this.__raw = raw;
    this.__mdastType = mdastType;
  }

  createDOM(_: EditorConfig): HTMLElement {
    const element = document.createElement("span");
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <PlaceholderInline raw={this.__raw} />;
  }

  exportJSON(): SerializedPlaceholderInlineNode {
    return {
      mdastType: this.__mdastType,
      raw: this.__raw,
      type: "placeholder-inline",
      version: 1,
    };
  }

  getRawMarkdown(): string {
    return this.__raw;
  }

  getMdastType(): string {
    return this.__mdastType;
  }

  isInline(): true {
    return true;
  }
}

export function $createPlaceholderInlineNode(
  raw: string,
  mdastType: string,
): PlaceholderInlineNode {
  return new PlaceholderInlineNode(raw, mdastType);
}

export function $isPlaceholderInlineNode(
  node: LexicalNode | null | undefined,
): node is PlaceholderInlineNode {
  return node instanceof PlaceholderInlineNode;
}
