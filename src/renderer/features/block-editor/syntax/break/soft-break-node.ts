import {
  $applyNodeReplacement,
  LineBreakNode,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
} from "lexical";

export class SoftBreakNode extends LineBreakNode {
  static getType(): string {
    return "soft-break";
  }

  static clone(node: SoftBreakNode): SoftBreakNode {
    return new SoftBreakNode(node.__key);
  }

  static importJSON(_: SerializedLexicalNode): SoftBreakNode {
    return $createSoftBreakNode();
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(): HTMLElement {
    const element = document.createElement("br");
    element.className = "block-editor__soft-break";
    return element;
  }

  exportJSON(): SerializedLexicalNode {
    return {
      type: "soft-break",
      version: 1,
    };
  }

  getTextContent(): "\n" {
    return "\n";
  }

  isInline(): true {
    return true;
  }

  updateDOM(): false {
    return false;
  }
}

export function $createSoftBreakNode(): SoftBreakNode {
  return $applyNodeReplacement(new SoftBreakNode());
}

export function $isSoftBreakNode(node: LexicalNode | null | undefined): node is SoftBreakNode {
  return node instanceof SoftBreakNode;
}
