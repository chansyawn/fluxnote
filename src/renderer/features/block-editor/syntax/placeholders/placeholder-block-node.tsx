import {
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";

export type SerializedPlaceholderBlockNode = Spread<
  {
    mdastType: string;
    raw: string;
  },
  SerializedLexicalNode
>;

function PlaceholderBlock({ raw }: { raw: string }): JSX.Element {
  return (
    <div className="block-editor__placeholder-block" contentEditable={false}>
      <pre>{raw}</pre>
    </div>
  );
}

export class PlaceholderBlockNode extends DecoratorNode<JSX.Element> {
  __raw: string;
  __mdastType: string;

  static getType(): string {
    return "placeholder-block";
  }

  static clone(node: PlaceholderBlockNode): PlaceholderBlockNode {
    return new PlaceholderBlockNode(node.__raw, node.__mdastType, node.__key);
  }

  static importJSON(serializedNode: SerializedPlaceholderBlockNode): PlaceholderBlockNode {
    return $createPlaceholderBlockNode(serializedNode.raw, serializedNode.mdastType);
  }

  constructor(raw: string, mdastType: string, key?: NodeKey) {
    super(key);
    this.__raw = raw;
    this.__mdastType = mdastType;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement("div");
    element.className = config.theme.blockCursor ?? "";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <PlaceholderBlock raw={this.__raw} />;
  }

  exportJSON(): SerializedPlaceholderBlockNode {
    return {
      mdastType: this.__mdastType,
      raw: this.__raw,
      type: "placeholder-block",
      version: 1,
    };
  }

  getRawMarkdown(): string {
    return this.__raw;
  }

  getMdastType(): string {
    return this.__mdastType;
  }

  isInline(): false {
    return false;
  }
}

export function $createPlaceholderBlockNode(raw: string, mdastType: string): PlaceholderBlockNode {
  return new PlaceholderBlockNode(raw, mdastType);
}

export function $isPlaceholderBlockNode(
  node: LexicalNode | null | undefined,
): node is PlaceholderBlockNode {
  return node instanceof PlaceholderBlockNode;
}
