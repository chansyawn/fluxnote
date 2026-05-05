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
    kind: string;
    markdown: string;
    metadata?: Record<string, unknown>;
  },
  SerializedLexicalNode
>;

function PlaceholderBlock({ markdown }: { markdown: string }): JSX.Element {
  return (
    <div className="block-editor__placeholder-block" contentEditable={false}>
      <pre>{markdown}</pre>
    </div>
  );
}

export class PlaceholderBlockNode extends DecoratorNode<JSX.Element> {
  __markdown: string;
  __kind: string;
  __metadata: Record<string, unknown> | undefined;

  static getType(): string {
    return "placeholder-block";
  }

  static clone(node: PlaceholderBlockNode): PlaceholderBlockNode {
    return new PlaceholderBlockNode(node.__markdown, node.__kind, node.__metadata, node.__key);
  }

  static importJSON(serializedNode: SerializedPlaceholderBlockNode): PlaceholderBlockNode {
    return $createPlaceholderBlockNode(
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

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement("div");
    element.className = config.theme.blockCursor ?? "";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <PlaceholderBlock markdown={this.__markdown} />;
  }

  exportJSON(): SerializedPlaceholderBlockNode {
    return {
      kind: this.__kind,
      markdown: this.__markdown,
      ...(this.__metadata ? { metadata: this.__metadata } : {}),
      type: "placeholder-block",
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

  isInline(): false {
    return false;
  }
}

export function $createPlaceholderBlockNode(
  markdown: string,
  kind: string,
  metadata?: Record<string, unknown>,
): PlaceholderBlockNode {
  return new PlaceholderBlockNode(markdown, kind, metadata);
}

export function $isPlaceholderBlockNode(
  node: LexicalNode | null | undefined,
): node is PlaceholderBlockNode {
  return node instanceof PlaceholderBlockNode;
}
