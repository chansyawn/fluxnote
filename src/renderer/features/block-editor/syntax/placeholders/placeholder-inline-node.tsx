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
    kind: string;
    markdown: string;
    metadata?: Record<string, unknown>;
  },
  SerializedLexicalNode
>;

function PlaceholderInline({ markdown }: { markdown: string }): JSX.Element {
  return (
    <span className="block-editor__placeholder-inline" contentEditable={false}>
      {markdown}
    </span>
  );
}

export class PlaceholderInlineNode extends DecoratorNode<JSX.Element> {
  __markdown: string;
  __kind: string;
  __metadata: Record<string, unknown> | undefined;

  static getType(): string {
    return "placeholder-inline";
  }

  static clone(node: PlaceholderInlineNode): PlaceholderInlineNode {
    return new PlaceholderInlineNode(node.__markdown, node.__kind, node.__metadata, node.__key);
  }

  static importJSON(serializedNode: SerializedPlaceholderInlineNode): PlaceholderInlineNode {
    return $createPlaceholderInlineNode(
      serializedNode.markdown,
      serializedNode.kind,
      serializedNode.metadata,
    );
  }

  constructor(markdown: string, kind: string, metadata?: Record<string, unknown>, key?: NodeKey) {
    super(key);
    this.__markdown = markdown;
    this.__kind = kind;
    this.__metadata = metadata;
  }

  createDOM(_: EditorConfig): HTMLElement {
    const element = document.createElement("span");
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <PlaceholderInline markdown={this.__markdown} />;
  }

  exportJSON(): SerializedPlaceholderInlineNode {
    return {
      kind: this.__kind,
      markdown: this.__markdown,
      ...(this.__metadata ? { metadata: this.__metadata } : {}),
      type: "placeholder-inline",
      version: 1,
    };
  }

  getMarkdown(): string {
    return this.__markdown;
  }

  getKind(): string {
    return this.__kind;
  }

  getMetadata(): Record<string, unknown> | undefined {
    return this.__metadata;
  }

  isInline(): true {
    return true;
  }
}

export function $createPlaceholderInlineNode(
  markdown: string,
  kind: string,
  metadata?: Record<string, unknown>,
): PlaceholderInlineNode {
  return new PlaceholderInlineNode(markdown, kind, metadata);
}

export function $isPlaceholderInlineNode(
  node: LexicalNode | null | undefined,
): node is PlaceholderInlineNode {
  return node instanceof PlaceholderInlineNode;
}
