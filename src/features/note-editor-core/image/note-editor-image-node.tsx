import {
  DecoratorNode,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";

import { NoteEditorImageComponent } from "./note-editor-image-component";

export type SerializedNoteEditorImageNode = Spread<
  {
    altText: string;
    src: string;
  },
  SerializedLexicalNode
>;

export class NoteEditorImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __blockId: string;

  static getType(): string {
    return "note-editor-image";
  }

  static clone(node: NoteEditorImageNode): NoteEditorImageNode {
    return new NoteEditorImageNode(node.__src, node.__altText, node.__blockId, node.__key);
  }

  static importJSON(serializedNode: SerializedNoteEditorImageNode): NoteEditorImageNode {
    return $createNoteEditorImageNode({
      altText: serializedNode.altText,
      src: serializedNode.src,
    });
  }

  constructor(src: string, altText: string, blockId = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__blockId = blockId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("span");
    element.className = "note-block-editor__image-node";
    return element;
  }

  updateDOM(): false {
    return false;
  }

  exportJSON(): SerializedNoteEditorImageNode {
    return {
      ...super.exportJSON(),
      altText: this.__altText,
      src: this.__src,
      type: "note-editor-image",
      version: 1,
    };
  }

  setBlockId(blockId: string): this {
    const writable = this.getWritable();
    writable.__blockId = blockId;
    return writable;
  }

  getBlockId(): string {
    return this.getLatest().__blockId;
  }

  getSrc(): string {
    return this.getLatest().__src;
  }

  getAltText(): string {
    return this.getLatest().__altText;
  }

  decorate(): JSX.Element {
    return (
      <NoteEditorImageComponent
        altText={this.__altText}
        blockId={this.__blockId}
        nodeKey={this.getKey()}
        src={this.__src}
      />
    );
  }

  isInline(): boolean {
    return true;
  }

  isIsolated(): boolean {
    return true;
  }

  isKeyboardSelectable(): boolean {
    return true;
  }
}

export function $createNoteEditorImageNode({
  src,
  altText,
  blockId = "",
}: {
  src: string;
  altText: string;
  blockId?: string;
}): NoteEditorImageNode {
  return new NoteEditorImageNode(src, altText, blockId);
}

export function $isNoteEditorImageNode(
  node: LexicalNode | null | undefined,
): node is NoteEditorImageNode {
  return node instanceof NoteEditorImageNode;
}
