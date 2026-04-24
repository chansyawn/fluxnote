import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import type { JSX } from "react";

import { NoteEditorImageComponent } from "./note-editor-image-component";
import { getCachedImageDataUrl, isInternalAssetUrl } from "./note-editor-image-utils";

export type SerializedNoteEditorImageNode = Spread<
  {
    altText: string;
    blockId: string;
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
      blockId: serializedNode.blockId || "",
      src: serializedNode.src,
    });
  }

  static importDOM(): DOMConversionMap {
    return {
      img: (_node: Node) => ({
        conversion: (domNode: Node): DOMConversionOutput | null => {
          if (!(domNode instanceof HTMLImageElement)) {
            return null;
          }
          const { alt, src } = domNode;
          const blockId = domNode.getAttribute("data-block-id") || "";
          return {
            node: $createNoteEditorImageNode({
              altText: alt,
              blockId,
              src,
            }),
          };
        },
        priority: 0,
      }),
    };
  }

  constructor(src: string, altText: string, blockId = "", key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__blockId = blockId;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement("div");
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
      blockId: this.__blockId,
      src: this.__src,
      type: "note-editor-image",
      version: 1,
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement("img");
    img.alt = this.__altText;

    if (isInternalAssetUrl(this.__src)) {
      img.src = getCachedImageDataUrl(this.__src, this.__blockId) ?? "";
      img.setAttribute("data-internal-asset", this.__src);
    } else {
      img.src = this.__src;
    }

    if (this.__blockId) {
      img.setAttribute("data-block-id", this.__blockId);
    }

    return { element: img };
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
    return false;
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
